// Wallets API
// GET /api/wallets - List all wallets
// POST /api/wallets - Create new wallet

export async function onRequestGet(context) {
    const { env } = context;

    try {
        const result = await env.DB.prepare(`
            SELECT w.*, 
                   COALESCE(SUM(CASE WHEN r.type = 'income' THEN r.amount ELSE 0 END), 0) as total_income,
                   COALESCE(SUM(CASE WHEN r.type = 'expense' THEN r.amount ELSE 0 END), 0) as total_expense
            FROM wallets w
            LEFT JOIN records r ON r.wallet_id = w.id
            GROUP BY w.id
            ORDER BY w.is_default DESC, w.created_at ASC
        `).all();

        // Calculate actual balance for each wallet
        const wallets = result.results.map(w => ({
            ...w,
            // For credit cards, show available credit
            available: w.type === 'credit_card'
                ? w.credit_limit - (w.total_expense - w.total_income)
                : w.balance + w.total_income - w.total_expense
        }));

        return new Response(JSON.stringify({
            success: true,
            data: wallets
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('List wallets error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '获取钱包列表失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { name, type, icon, color, balance, credit_limit, is_default } = await request.json();

        if (!name || !type) {
            return new Response(JSON.stringify({
                success: false,
                error: '请填写钱包名称和类型'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // If setting as default, unset other defaults
        if (is_default) {
            await env.DB.prepare('UPDATE wallets SET is_default = 0').run();
        }

        const result = await env.DB.prepare(`
            INSERT INTO wallets (name, type, icon, color, balance, credit_limit, is_default)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(
            name,
            type,
            icon || getDefaultIcon(type),
            color || getDefaultColor(type),
            balance || 0,
            credit_limit || 0,
            is_default ? 1 : 0
        ).run();

        return new Response(JSON.stringify({
            success: true,
            data: { id: result.meta.last_row_id }
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Create wallet error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '创建钱包失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

function getDefaultIcon(type) {
    const icons = {
        'debit_card': '💳',
        'credit_card': '🏦',
        'cash': '💵',
        'fund': '📈',
        'e_wallet': '📱'
    };
    return icons[type] || '💰';
}

function getDefaultColor(type) {
    const colors = {
        'debit_card': '#3498DB',
        'credit_card': '#9B59B6',
        'cash': '#2ECC71',
        'fund': '#E74C3C',
        'e_wallet': '#1ABC9C'
    };
    return colors[type] || '#95A5A6';
}
