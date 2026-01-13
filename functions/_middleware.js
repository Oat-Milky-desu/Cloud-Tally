// Global middleware for authentication
// This middleware runs before all /api/* requests

const PUBLIC_PATHS = ['/api/auth/login', '/api/auth/verify'];

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  
  // Allow public paths without authentication
  if (PUBLIC_PATHS.some(path => url.pathname === path)) {
    return next();
  }
  
  // Skip middleware for non-API routes
  if (!url.pathname.startsWith('/api/')) {
    return next();
  }
  
  // Get session token from cookie
  const cookies = request.headers.get('Cookie') || '';
  const sessionMatch = cookies.match(/session=([^;]+)/);
  const sessionToken = sessionMatch ? sessionMatch[1] : null;
  
  if (!sessionToken) {
    return new Response(JSON.stringify({ error: 'Unauthorized', code: 'NO_SESSION' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Verify session in database
    const session = await env.DB.prepare(
      'SELECT * FROM sessions WHERE id = ? AND expires_at > datetime("now")'
    ).bind(sessionToken).first();
    
    if (!session) {
      // Clean up expired session
      await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionToken).run();
      
      return new Response(JSON.stringify({ error: 'Session expired', code: 'SESSION_EXPIRED' }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          'Set-Cookie': 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Strict'
        }
      });
    }
    
    // Add user info to context for downstream handlers
    context.data = context.data || {};
    context.data.user = { username: session.username };
    
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return new Response(JSON.stringify({ error: 'Authentication error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
