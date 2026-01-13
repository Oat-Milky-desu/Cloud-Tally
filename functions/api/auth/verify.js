// Verify session endpoint
// GET /api/auth/verify

export async function onRequestGet(context) {
    const { request, env } = context;

    try {
        // Get session token from cookie
        const cookies = request.headers.get('Cookie') || '';
        const sessionMatch = cookies.match(/session=([^;]+)/);
        const sessionToken = sessionMatch ? sessionMatch[1] : null;

        if (!sessionToken) {
            return new Response(JSON.stringify({
                authenticated: false,
                reason: 'no_session'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Check session in database
        const session = await env.DB.prepare(
            'SELECT * FROM sessions WHERE id = ? AND expires_at > datetime("now")'
        ).bind(sessionToken).first();

        if (!session) {
            return new Response(JSON.stringify({
                authenticated: false,
                reason: 'session_expired'
            }), {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Set-Cookie': 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict'
                }
            });
        }

        return new Response(JSON.stringify({
            authenticated: true,
            username: session.username,
            expiresAt: session.expires_at
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Verify error:', error);
        return new Response(JSON.stringify({
            authenticated: false,
            error: '验证失败'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
