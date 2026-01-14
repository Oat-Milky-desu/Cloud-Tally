// AI Parse API
// POST /api/ai/parse - Parse natural language input to structured record

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { text } = await request.json();

        if (!text) {
            return new Response(JSON.stringify({
                success: false,
                error: '请输入文本'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get AI configuration from environment
        const apiKey = env.AI_API_KEY;
        const apiBase = env.AI_API_BASE || 'https://api.openai.com/v1';
        const model = env.AI_MODEL || 'gpt-4o-mini';

        if (!apiKey) {
            return new Response(JSON.stringify({
                success: false,
                error: 'AI API 未配置'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get today's date
        const today = new Date().toISOString().split('T')[0];

        // Get categories for context
        const categories = await env.DB.prepare('SELECT name, type FROM categories').all();
        const categoryList = categories.results?.map(c => `${c.name}(${c.type})`).join(', ') || '';

        // Prepare prompt - simplified for better compatibility
        const systemPrompt = `你是一个智能记账助手。根据用户的自然语言描述，解析出结构化的账目信息。

可用的类别有: ${categoryList}

请严格以纯JSON格式返回（不要用markdown代码块包裹），包含以下字段:
{"type": "income或expense", "amount": 金额数字, "category": "类别名称", "description": "简短描述", "date": "YYYY-MM-DD"}

今天的日期是: ${today}
如果用户没有提到日期，使用今天的日期。
如果无法解析，返回: {"error": "无法解析"}`;

        // Call AI API
        const response = await fetch(`${apiBase}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text }
                ],
                temperature: 0.1,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('AI API error:', response.status, errorText);
            return new Response(JSON.stringify({
                success: false,
                error: 'AI 服务调用失败',
                debug: `Status: ${response.status}, Body: ${errorText.substring(0, 200)}`
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const result = await response.json();

        // Handle different API response formats
        let content = null;

        // OpenAI format: result.choices[0].message.content
        if (result.choices && result.choices[0]?.message?.content) {
            content = result.choices[0].message.content;
        }
        // Some APIs use different formats
        else if (result.response) {
            content = result.response;
        }
        else if (result.text) {
            content = result.text;
        }
        else if (result.content) {
            content = result.content;
        }
        else if (typeof result === 'string') {
            content = result;
        }

        if (!content) {
            console.error('AI response structure:', JSON.stringify(result).substring(0, 500));
            return new Response(JSON.stringify({
                success: false,
                error: 'AI 返回格式不兼容',
                debug: JSON.stringify(result).substring(0, 300)
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Parse JSON from response
        let parsed;
        try {
            // Clean up the response
            let cleanContent = content.trim();

            // Remove markdown code blocks if present
            cleanContent = cleanContent.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');
            cleanContent = cleanContent.trim();

            // Try to extract JSON object
            const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON object found');
            }
        } catch (e) {
            console.error('JSON parse error:', e.message, 'Raw content:', content);
            return new Response(JSON.stringify({
                success: false,
                error: '解析AI响应失败',
                debug: content.substring(0, 300)
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (parsed.error) {
            return new Response(JSON.stringify({
                success: false,
                error: parsed.error
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate required fields
        if (!parsed.type || !parsed.amount || !parsed.category) {
            return new Response(JSON.stringify({
                success: false,
                error: 'AI返回数据不完整',
                debug: JSON.stringify(parsed)
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            data: parsed
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('AI parse error:', error.message, error.stack);
        return new Response(JSON.stringify({
            success: false,
            error: '处理失败',
            debug: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
