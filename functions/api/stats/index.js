// Stats API
// GET /api/stats - Get statistics summary

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    try {
        const startDate = url.searchParams.get('startDate');
        const endDate = url.searchParams.get('endDate');
        const groupBy = url.searchParams.get('groupBy') || 'month'; // day, week, month, year

        // Build where clause
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

        // Get summary totals
        const totals = await env.DB.prepare(`
      SELECT 
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as totalIncome,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as totalExpense,
        COUNT(*) as recordCount
      FROM records WHERE ${whereClause}
    `).bind(...params).first();

        // Get by category
        const byCategory = await env.DB.prepare(`
      SELECT 
        category,
        type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM records 
      WHERE ${whereClause}
      GROUP BY category, type
      ORDER BY total DESC
    `).bind(...params).all();

        // Get by time period
        let dateFormat;
        switch (groupBy) {
            case 'day':
                dateFormat = '%Y-%m-%d';
                break;
            case 'week':
                dateFormat = '%Y-W%W';
                break;
            case 'year':
                dateFormat = '%Y';
                break;
            case 'month':
            default:
                dateFormat = '%Y-%m';
        }

        const byPeriod = await env.DB.prepare(`
      SELECT 
        strftime('${dateFormat}', date) as period,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense,
        COUNT(*) as count
      FROM records 
      WHERE ${whereClause}
      GROUP BY period
      ORDER BY period DESC
      LIMIT 12
    `).bind(...params).all();

        // Get recent records
        const recentRecords = await env.DB.prepare(`
      SELECT * FROM records 
      WHERE ${whereClause}
      ORDER BY date DESC, created_at DESC
      LIMIT 10
    `).bind(...params).all();

        // Calculate derived stats
        const totalIncome = totals?.totalIncome || 0;
        const totalExpense = totals?.totalExpense || 0;
        const netBalance = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome * 100).toFixed(1) : 0;

        // Process category data
        const expenseCategories = [];
        const incomeCategories = [];

        for (const item of byCategory.results || []) {
            const categoryData = {
                category: item.category,
                total: item.total,
                count: item.count,
                percentage: 0
            };

            if (item.type === 'expense') {
                categoryData.percentage = totalExpense > 0 ? (item.total / totalExpense * 100).toFixed(1) : 0;
                expenseCategories.push(categoryData);
            } else {
                categoryData.percentage = totalIncome > 0 ? (item.total / totalIncome * 100).toFixed(1) : 0;
                incomeCategories.push(categoryData);
            }
        }

        return new Response(JSON.stringify({
            success: true,
            data: {
                summary: {
                    totalIncome,
                    totalExpense,
                    netBalance,
                    savingsRate: parseFloat(savingsRate),
                    recordCount: totals?.recordCount || 0
                },
                byCategory: {
                    expense: expenseCategories,
                    income: incomeCategories
                },
                byPeriod: (byPeriod.results || []).reverse(),
                recentRecords: recentRecords.results || []
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '获取统计数据失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
