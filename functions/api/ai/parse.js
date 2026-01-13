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

        // Prepare prompt
        const systemPrompt = `你是一个智能记账助手。根据用户的自然语言描述，解析出结构化的账目信息。

可用的类别有: ${categoryList}

请以JSON格式返回，包含以下字段:
- type: "income" 或 "expense"
- amount: 金额(数字)
- category: 类别名称(从可用类别中选择最匹配的)
- description: 简短描述
- date: 日期(YYYY-MM-DD格式，如果未提及则使用今天: ${today})

只返回JSON，不要有其他内容。如果无法解析，返回 {"error": "无法解析"}`;

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
            const error = await response.text();
            console.error('AI API error:', error);
            return new Response(JSON.stringify({
                success: false,
                error: 'AI 服务调用失败'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const result = await response.json();
        const content = result.choices?.[0]?.message?.content;

        if (!content) {
            return new Response(JSON.stringify({
                success: false,
                error: 'AI 返回为空'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Parse JSON from response
        let parsed;
        try {
            // Try to extract JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found');
            }
        } catch (e) {
            console.error('Parse error:', e, content);
            return new Response(JSON.stringify({
                success: false,
                error: '解析AI响应失败'
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

        return new Response(JSON.stringify({
            success: true,
            data: parsed
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('AI parse error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '处理失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
