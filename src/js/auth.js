// Auth Module - Handles authentication state

const Auth = {
    user: null,

    async checkAuth() {
        try {
            const result = await API.auth.verify();
            if (result && result.authenticated) {
                this.user = {
                    username: result.username,
                    expiresAt: result.expiresAt
                };
                return true;
            }
            return false;
        } catch (error) {
            console.error('Auth check failed:', error);
            return false;
        }
    },

    async logout() {
        try {
            await API.auth.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.user = null;
            window.location.href = '/login.html';
        }
    },

    // Redirect to login if not authenticated
    async requireAuth() {
        const isAuthenticated = await this.checkAuth();
        if (!isAuthenticated) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    }
};

window.Auth = Auth;
