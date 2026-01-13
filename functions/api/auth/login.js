// Login endpoint
// POST /api/auth/login

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { username, password } = await request.json();

        // Get credentials from environment variables
        const validUsername = env.AUTH_USERNAME || 'admin';
        const validPassword = env.AUTH_PASSWORD || 'admin123';
        const expiryHours = parseInt(env.SESSION_EXPIRY_HOURS || '24', 10);

        // Validate credentials
        if (username !== validUsername || password !== validPassword) {
            return new Response(JSON.stringify({
                success: false,
                error: '用户名或密码错误'
            }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Generate session token
        const sessionToken = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();

        // Clean up old sessions for this user
        await env.DB.prepare('DELETE FROM sessions WHERE username = ?').bind(username).run();

        // Store session in database
        await env.DB.prepare(
            'INSERT INTO sessions (id, username, expires_at) VALUES (?, ?, ?)'
        ).bind(sessionToken, username, expiresAt).run();

        // Set cookie (don't use Secure on localhost for development)
        const isSecure = request.url.startsWith('https://');
        const cookieOptions = [
            `session=${sessionToken}`,
            'Path=/',
            `Max-Age=${expiryHours * 60 * 60}`,
            'HttpOnly',
            'SameSite=Lax'
        ];
        if (isSecure) {
            cookieOptions.push('Secure');
        }

        return new Response(JSON.stringify({
            success: true,
            message: '登录成功',
            expiresAt
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Set-Cookie': cookieOptions.join('; ')
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: '登录失败，请稍后重试'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
