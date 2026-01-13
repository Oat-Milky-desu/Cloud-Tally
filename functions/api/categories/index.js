// Categories API
// GET /api/categories - List categories

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const type = url.searchParams.get('type'); // 'income' or 'expense'

    try {
        let query = 'SELECT * FROM categories';
        const params = [];

        if (type) {
            query += ' WHERE type = ?';
            params.push(type);
        }

        query += ' ORDER BY type, name';

        const result = await env.DB.prepare(query).bind(...params).all();

        return new Response(JSON.stringify({
            success: true,
            data: result.results || []
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Get categories error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '获取类别失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { name, type, icon, color } = await request.json();

        if (!name || !type) {
            return new Response(JSON.stringify({
                success: false,
                error: '缺少必填字段: name, type'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (!['income', 'expense'].includes(type)) {
            return new Response(JSON.stringify({
                success: false,
                error: '无效的类型'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await env.DB.prepare(
            'INSERT OR IGNORE INTO categories (name, type, icon, color) VALUES (?, ?, ?, ?)'
        ).bind(name, type, icon || '📌', color || '#808080').run();

        return new Response(JSON.stringify({
            success: true,
            message: '类别已创建'
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Create category error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '创建类别失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
