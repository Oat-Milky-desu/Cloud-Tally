// Single Wallet API
// GET /api/wallets/:id - Get wallet details
// PUT /api/wallets/:id - Update wallet
// DELETE /api/wallets/:id - Delete wallet

export async function onRequestGet(context) {
    const { env, params } = context;
    const id = params.id;

    try {
        const wallet = await env.DB.prepare(`
            SELECT w.*, 
                   COALESCE(SUM(CASE WHEN r.type = 'income' THEN r.amount ELSE 0 END), 0) as total_income,
                   COALESCE(SUM(CASE WHEN r.type = 'expense' THEN r.amount ELSE 0 END), 0) as total_expense
            FROM wallets w
            LEFT JOIN records r ON r.wallet_id = w.id
            WHERE w.id = ?
            GROUP BY w.id
        `).bind(id).first();

        if (!wallet) {
            return new Response(JSON.stringify({
                success: false,
                error: '钱包不存在'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Calculate available balance
        wallet.available = wallet.type === 'credit_card'
            ? wallet.credit_limit - (wallet.total_expense - wallet.total_income)
            : wallet.balance + wallet.total_income - wallet.total_expense;

        return new Response(JSON.stringify({
            success: true,
            data: wallet
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Get wallet error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '获取钱包详情失败'
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
        const { name, type, icon, color, balance, credit_limit, is_default } = await request.json();

        // Check if wallet exists
        const existing = await env.DB.prepare('SELECT * FROM wallets WHERE id = ?').bind(id).first();
        if (!existing) {
            return new Response(JSON.stringify({
                success: false,
                error: '钱包不存在'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // If setting as default, unset other defaults
        if (is_default) {
            await env.DB.prepare('UPDATE wallets SET is_default = 0').run();
        }

        await env.DB.prepare(`
            UPDATE wallets SET
                name = COALESCE(?, name),
                type = COALESCE(?, type),
                icon = COALESCE(?, icon),
                color = COALESCE(?, color),
                balance = COALESCE(?, balance),
                credit_limit = COALESCE(?, credit_limit),
                is_default = ?,
                updated_at = datetime('now')
            WHERE id = ?
        `).bind(
            name,
            type,
            icon,
            color,
            balance,
            credit_limit,
            is_default ? 1 : 0,
            id
        ).run();

        return new Response(JSON.stringify({
            success: true,
            message: '钱包已更新'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Update wallet error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '更新钱包失败'
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
        // Check if wallet exists
        const existing = await env.DB.prepare('SELECT * FROM wallets WHERE id = ?').bind(id).first();
        if (!existing) {
            return new Response(JSON.stringify({
                success: false,
                error: '钱包不存在'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check if wallet has records
        const recordCount = await env.DB.prepare('SELECT COUNT(*) as count FROM records WHERE wallet_id = ?').bind(id).first();
        if (recordCount.count > 0) {
            return new Response(JSON.stringify({
                success: false,
                error: `该钱包有 ${recordCount.count} 条关联记录，无法删除`
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await env.DB.prepare('DELETE FROM wallets WHERE id = ?').bind(id).run();

        return new Response(JSON.stringify({
            success: true,
            message: '钱包已删除'
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Delete wallet error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '删除钱包失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
