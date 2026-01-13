// Records API
// GET /api/records - List records
// POST /api/records - Create record

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);

    try {
        // Parse query parameters
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const limit = parseInt(url.searchParams.get('limit') || '20', 10);
        const type = url.searchParams.get('type'); // 'income' or 'expense'
        const category = url.searchParams.get('category');
        const startDate = url.searchParams.get('startDate');
        const endDate = url.searchParams.get('endDate');
        const offset = (page - 1) * limit;

        // Build query
        let whereClause = '1=1';
        const params = [];

        if (type) {
            whereClause += ' AND type = ?';
            params.push(type);
        }

        if (category) {
            whereClause += ' AND category = ?';
            params.push(category);
        }

        if (startDate) {
            whereClause += ' AND date >= ?';
            params.push(startDate);
        }

        if (endDate) {
            whereClause += ' AND date <= ?';
            params.push(endDate);
        }

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM records WHERE ${whereClause}`;
        const countResult = await env.DB.prepare(countQuery).bind(...params).first();
        const total = countResult?.total || 0;

        // Get records
        const query = `
      SELECT * FROM records 
      WHERE ${whereClause}
      ORDER BY date DESC, created_at DESC
      LIMIT ? OFFSET ?
    `;
        const records = await env.DB.prepare(query)
            .bind(...params, limit, offset)
            .all();

        return new Response(JSON.stringify({
            success: true,
            data: records.results || [],
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Get records error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '获取记录失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const data = await request.json();
        const { type, amount, category, description, date } = data;

        // Validate required fields
        if (!type || !amount || !category || !date) {
            return new Response(JSON.stringify({
                success: false,
                error: '缺少必填字段: type, amount, category, date'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate type
        if (!['income', 'expense'].includes(type)) {
            return new Response(JSON.stringify({
                success: false,
                error: '无效的类型，必须是 income 或 expense'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Insert record
        const result = await env.DB.prepare(
            'INSERT INTO records (type, amount, category, description, date) VALUES (?, ?, ?, ?, ?)'
        ).bind(type, parseFloat(amount), category, description || '', date).run();

        // Get the inserted record
        const record = await env.DB.prepare(
            'SELECT * FROM records WHERE id = ?'
        ).bind(result.meta.last_row_id).first();

        return new Response(JSON.stringify({
            success: true,
            message: '记录已创建',
            data: record
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Create record error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '创建记录失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
