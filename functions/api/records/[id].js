// Single Record API
// GET /api/records/:id - Get single record
// PUT /api/records/:id - Update record
// DELETE /api/records/:id - Delete record

export async function onRequestGet(context) {
    const { env, params } = context;
    const id = params.id;

    try {
        const record = await env.DB.prepare(
            'SELECT * FROM records WHERE id = ?'
        ).bind(id).first();

        if (!record) {
            return new Response(JSON.stringify({
                success: false,
                error: '记录不存在'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({
            success: true,
            data: record
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Get record error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '获取记录失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPut(context) {
    const { request, env, params } = context;
    const id = params.id;

    try {
        // Check if record exists
        const existing = await env.DB.prepare(
            'SELECT * FROM records WHERE id = ?'
        ).bind(id).first();

        if (!existing) {
            return new Response(JSON.stringify({
                success: false,
                error: '记录不存在'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const data = await request.json();
        const { type, amount, category, description, date, wallet_id } = data;

        // Update record
        await env.DB.prepare(`
            UPDATE records 
            SET type = ?, amount = ?, category = ?, description = ?, date = ?, wallet_id = ?, updated_at = datetime('now')
            WHERE id = ?
        `).bind(
            type || existing.type,
            amount !== undefined ? parseFloat(amount) : existing.amount,
            category || existing.category,
            description !== undefined ? description : existing.description,
            date || existing.date,
            wallet_id !== undefined ? wallet_id : existing.wallet_id,
            id
        ).run();

        // Get updated record
        const record = await env.DB.prepare(
            'SELECT * FROM records WHERE id = ?'
        ).bind(id).first();

        return new Response(JSON.stringify({
            success: true,
            message: '记录已更新',
            data: record
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Update record error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '更新记录失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestDelete(context) {
    const { env, params } = context;
    const id = params.id;

    try {
        // Check if record exists
        const existing = await env.DB.prepare(
            'SELECT * FROM records WHERE id = ?'
        ).bind(id).first();

        if (!existing) {
            return new Response(JSON.stringify({
                success: false,
                error: '记录不存在'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Delete record
        await env.DB.prepare('DELETE FROM records WHERE id = ?').bind(id).run();

        return new Response(JSON.stringify({
            success: true,
            message: '记录已删除'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Delete record error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '删除记录失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
