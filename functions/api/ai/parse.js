// AI Parse API
// POST /api/ai/parse - Parse natural language input to structured record

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { text } = await request.json();

        if (!text) {
            return jsonResponse({ success: false, error: '请输入文本' }, 400);
        }

        const apiKey = env.AI_API_KEY;
        const apiBase = env.AI_API_BASE || 'https://api.openai.com/v1';
        const model = env.AI_MODEL || 'gpt-4o-mini';

        if (!apiKey) {
            return jsonResponse({ success: false, error: 'AI API 未配置' }, 500);
        }

        const today = new Date().toISOString().split('T')[0];

        // Get categories
        const categories = await env.DB.prepare('SELECT name, type FROM categories').all();
        const categoryList = categories.results?.map(c => `${c.name}(${c.type})`).join(', ') || '';

        // Updated prompt to handle multiple records
        const systemPrompt = `你是一个智能记账助手。根据用户输入解析账目信息。

可用类别: ${categoryList}
今天日期: ${today}

规则:
1. 如果用户提到多笔账目，返回数组格式
2. 如果只有一笔账目，也返回数组格式（包含一个元素）
3. 不要使用markdown代码块，直接返回纯JSON

返回格式示例:
[{"type":"expense","amount":10,"category":"餐饮","description":"晚饭","date":"${today}"}]

每个对象包含: type(income/expense), amount(数字), category(类别名), description(描述), date(YYYY-MM-DD)

如无法解析，返回: {"error":"无法解析"}`;

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
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            return jsonResponse({
                success: false,
                error: 'AI服务调用失败',
                debug: `HTTP ${response.status}: ${errorText.substring(0, 200)}`
            }, 500);
        }

        const result = await response.json();

        // Extract content from various API response formats
        let content = result.choices?.[0]?.message?.content
            || result.response
            || result.text
            || result.content
            || (typeof result === 'string' ? result : null);

        if (!content) {
            return jsonResponse({
                success: false,
                error: 'AI返回格式不兼容',
                debug: JSON.stringify(result).substring(0, 300)
            }, 500);
        }

        // Parse the response
        let parsed;
        try {
            let cleanContent = content.trim();

            // Remove markdown code blocks
            cleanContent = cleanContent.replace(/^```(?:json)?\s*\n?/gi, '').replace(/\n?```\s*$/gi, '');
            cleanContent = cleanContent.trim();

            // Try to parse as JSON (array or object)
            if (cleanContent.startsWith('[')) {
                // Array format
                const arrayMatch = cleanContent.match(/\[[\s\S]*\]/);
                if (arrayMatch) {
                    parsed = JSON.parse(arrayMatch[0]);
                }
            } else if (cleanContent.startsWith('{')) {
                // Object format - could be single record or error
                const objectMatch = cleanContent.match(/\{[\s\S]*\}/);
                if (objectMatch) {
                    const obj = JSON.parse(objectMatch[0]);
                    // If it's an error object
                    if (obj.error) {
                        return jsonResponse({ success: false, error: obj.error }, 400);
                    }
                    // Wrap single object in array
                    parsed = [obj];
                }
            }

            if (!parsed) {
                throw new Error('无法识别JSON格式');
            }
        } catch (e) {
            return jsonResponse({
                success: false,
                error: '解析AI响应失败',
                debug: `${e.message} | 原始内容: ${content.substring(0, 200)}`
            }, 500);
        }

        // Validate parsed data
        if (!Array.isArray(parsed) || parsed.length === 0) {
            return jsonResponse({
                success: false,
                error: 'AI返回数据格式错误',
                debug: JSON.stringify(parsed).substring(0, 200)
            }, 400);
        }

        // Validate each record
        for (let i = 0; i < parsed.length; i++) {
            const record = parsed[i];
            if (!record.type || !record.amount || !record.category) {
                return jsonResponse({
                    success: false,
                    error: `第${i + 1}条记录数据不完整`,
                    debug: JSON.stringify(record)
                }, 400);
            }
        }

        // Return single record or array based on count
        if (parsed.length === 1) {
            return jsonResponse({ success: true, data: parsed[0] });
        } else {
            return jsonResponse({ success: true, data: parsed, multiple: true });
        }

    } catch (error) {
        return jsonResponse({
            success: false,
            error: '处理失败',
            debug: error.message
        }, 500);
    }
}

function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
