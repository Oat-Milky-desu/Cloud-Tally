// API Module - Handles all API calls

const API = {
    // Base fetch wrapper with error handling
    async request(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        };

        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };

        try {
            const response = await fetch(url, mergedOptions);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    // Unauthorized - redirect to login
                    window.location.href = '/login.html';
                    return null;
                }
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Auth endpoints
    auth: {
        async login(username, password) {
            return API.request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
        },

        async logout() {
            return API.request('/api/auth/logout', {
                method: 'POST'
            });
        },

        async verify() {
            return API.request('/api/auth/verify');
        }
    },

    // Records endpoints
    records: {
        async list(params = {}) {
            const queryString = new URLSearchParams(params).toString();
            return API.request(`/api/records${queryString ? '?' + queryString : ''}`);
        },

        async get(id) {
            return API.request(`/api/records/${id}`);
        },

        async create(data) {
            return API.request('/api/records', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        async update(id, data) {
            return API.request(`/api/records/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        },

        async delete(id) {
            return API.request(`/api/records/${id}`, {
                method: 'DELETE'
            });
        }
    },

    // Categories endpoints
    categories: {
        async list(type = '') {
            const queryString = type ? `?type=${type}` : '';
            return API.request(`/api/categories${queryString}`);
        },

        async create(data) {
            return API.request('/api/categories', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }
    },

    // Wallets endpoints
    wallets: {
        async list() {
            return API.request('/api/wallets');
        },

        async get(id) {
            return API.request(`/api/wallets/${id}`);
        },

        async create(data) {
            return API.request('/api/wallets', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        async update(id, data) {
            return API.request(`/api/wallets/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        },

        async delete(id) {
            return API.request(`/api/wallets/${id}`, {
                method: 'DELETE'
            });
        }
    },

    // Stats endpoints
    stats: {
        async get(params = {}) {
            const queryString = new URLSearchParams(params).toString();
            return API.request(`/api/stats${queryString ? '?' + queryString : ''}`);
        }
    },

    // AI endpoints
    ai: {
        async parse(text) {
            return API.request('/api/ai/parse', {
                method: 'POST',
                body: JSON.stringify({ text })
            });
        },

        async ocr(image) {
            return API.request('/api/ai/ocr', {
                method: 'POST',
                body: JSON.stringify({ image })
            });
        },

        async analyze(params = {}) {
            return API.request('/api/ai/analyze', {
                method: 'POST',
                body: JSON.stringify(params)
            });
        }
    }
};

// Export for use in other modules
window.API = API;
