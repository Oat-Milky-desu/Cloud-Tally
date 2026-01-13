// AI Analyze API
// POST /api/ai/analyze - Generate financial analysis report

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { startDate, endDate, type } = await request.json();

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

        // Build query for records
        let whereClause = '1=1';
        const params = [];

        if (startDate) {
            whereClause += ' AND date >= ?';
            params.push(startDate);
        }

        if (endDate) {
            whereClause += ' AND date <= ?';
            params.push(endDate);
        }

        if (type) {
            whereClause += ' AND type = ?';
            params.push(type);
        }

        // Get records for analysis
        const records = await env.DB.prepare(`
      SELECT * FROM records WHERE ${whereClause} ORDER BY date DESC
    `).bind(...params).all();

        // Calculate summary stats
        const stats = {
            totalIncome: 0,
            totalExpense: 0,
            byCategory: {},
            byMonth: {},
            recordCount: records.results?.length || 0
        };

        for (const record of records.results || []) {
            if (record.type === 'income') {
                stats.totalIncome += record.amount;
            } else {
                stats.totalExpense += record.amount;
            }

            // By category
            if (!stats.byCategory[record.category]) {
                stats.byCategory[record.category] = { income: 0, expense: 0, count: 0 };
            }
            stats.byCategory[record.category][record.type] += record.amount;
            stats.byCategory[record.category].count++;

            // By month
            const month = record.date.substring(0, 7);
            if (!stats.byMonth[month]) {
                stats.byMonth[month] = { income: 0, expense: 0 };
            }
            stats.byMonth[month][record.type] += record.amount;
        }

        stats.netBalance = stats.totalIncome - stats.totalExpense;

        // If no records, return stats only
        if (stats.recordCount === 0) {
            return new Response(JSON.stringify({
                success: true,
                data: {
                    stats,
                    analysis: '暂无记录数据，无法生成分析报告。请先添加一些收支记录。',
                    suggestions: ['开始记录您的日常收支', '可以使用自然语言或图片快速记账']
                }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Prepare data summary for AI
        const dataSummary = `
分析时间范围: ${startDate || '全部'} 至 ${endDate || '全部'}
总记录数: ${stats.recordCount}
总收入: ¥${stats.totalIncome.toFixed(2)}
总支出: ¥${stats.totalExpense.toFixed(2)}
净余额: ¥${stats.netBalance.toFixed(2)}

按类别统计:
${Object.entries(stats.byCategory).map(([cat, data]) =>
            `- ${cat}: 收入¥${data.income.toFixed(2)}, 支出¥${data.expense.toFixed(2)}, ${data.count}笔`
        ).join('\n')}

按月统计:
${Object.entries(stats.byMonth).sort().map(([month, data]) =>
            `- ${month}: 收入¥${data.income.toFixed(2)}, 支出¥${data.expense.toFixed(2)}`
        ).join('\n')}

最近10条记录:
${(records.results || []).slice(0, 10).map(r =>
            `- ${r.date} ${r.type === 'income' ? '收入' : '支出'} ¥${r.amount} ${r.category} ${r.description}`
        ).join('\n')}
`;

        // Call AI for analysis
        const systemPrompt = `你是一个专业的财务分析师。根据用户的收支数据，提供详细的财务分析和建议。

请以JSON格式返回，包含以下字段:
- analysis: 详细的财务分析文本(500字以内)，包括:
  1. 整体财务状况评估
  2. 收支结构分析
  3. 主要支出类别分析
  4. 趋势观察(如果有多月数据)
- suggestions: 具体的理财建议数组(3-5条)
- highlights: 重要发现或警示数组(1-3条)
- healthScore: 财务健康评分(1-100)

只返回JSON，不要有其他内容。分析要专业、具体、有建设性。`;

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
                    { role: 'user', content: dataSummary }
                ],
                temperature: 0.7,
                max_tokens: 1500
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('AI API error:', error);
            // Return stats even if AI fails
            return new Response(JSON.stringify({
                success: true,
                data: {
                    stats,
                    analysis: 'AI 分析服务暂时不可用，以下是您的数据统计摘要。',
                    suggestions: [],
                    aiError: true
                }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const result = await response.json();
        const content = result.choices?.[0]?.message?.content;

        let aiAnalysis = {
            analysis: '',
            suggestions: [],
            highlights: [],
            healthScore: 0
        };

        if (content) {
            try {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    aiAnalysis = JSON.parse(jsonMatch[0]);
                }
            } catch (e) {
                console.error('Parse AI response error:', e);
                aiAnalysis.analysis = content;
            }
        }

        return new Response(JSON.stringify({
            success: true,
            data: {
                stats,
                ...aiAnalysis
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('AI analyze error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '分析失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
