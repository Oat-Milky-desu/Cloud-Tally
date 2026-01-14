// AI OCR API
// POST /api/ai/ocr - Extract expense info from receipt image

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { image } = await request.json();

        if (!image) {
            return new Response(JSON.stringify({
                success: false,
                error: '请上传图片'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get AI configuration from environment
        const apiKey = env.AI_API_KEY;
        const apiBase = env.AI_API_BASE || 'https://api.openai.com/v1';
        const visionModel = env.AI_VISION_MODEL || env.AI_MODEL || 'gpt-4o';

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
        const systemPrompt = `你是一个智能记账助手。分析图片中的小票/发票/账单，提取账目信息。

可用的类别有: ${categoryList}

请以JSON格式返回，包含以下字段:
- type: "income" 或 "expense" (通常是 expense)
- amount: 总金额(数字，识别金额/总计/合计等)
- category: 类别名称(从可用类别中选择最匹配的)
- description: 商家名称或购买内容的简短描述
- date: 日期(YYYY-MM-DD格式，从票据中识别，如果无法识别则使用今天: ${today})
- items: 可选，商品明细数组

只返回JSON，不要有其他内容。如果图片不是有效的票据或无法识别，返回 {"error": "无法识别图片内容"}`;

        // Call AI API with vision
        const response = await fetch(`${apiBase}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: visionModel,
                messages: [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: '请分析这张图片中的账目信息' },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: image.startsWith('data:') ? image : `data:image/jpeg;base64,${image}`
                                }
                            }
                        ]
                    }
                ],
                temperature: 0.1,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('AI Vision API error:', error);
            return new Response(JSON.stringify({
                success: false,
                error: 'AI 视觉服务调用失败'
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
            // Clean up the response - remove markdown code blocks if present
            let cleanContent = content.trim();

            // Remove ```json ... ``` or ``` ... ``` wrappers
            if (cleanContent.startsWith('```')) {
                cleanContent = cleanContent.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
            }

            const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                parsed = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (e) {
            console.error('Parse error:', e.message, 'Content:', content);
            return new Response(JSON.stringify({
                success: false,
                error: '解析AI响应失败',
                debug: content.substring(0, 200)
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
        console.error('AI OCR error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '处理失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
