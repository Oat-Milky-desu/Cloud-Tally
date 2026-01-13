// Logout endpoint
// POST /api/auth/logout

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        // Get session token from cookie
        const cookies = request.headers.get('Cookie') || '';
        const sessionMatch = cookies.match(/session=([^;]+)/);
        const sessionToken = sessionMatch ? sessionMatch[1] : null;

        if (sessionToken) {
            // Delete session from database
            await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionToken).run();
        }

        // Clear cookie
        return new Response(JSON.stringify({
            success: true,
            message: '已退出登录'
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict'
            }
        });
    } catch (error) {
        console.error('Logout error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '退出失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
