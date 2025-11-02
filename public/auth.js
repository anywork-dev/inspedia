// Authentication utilities for client-side

class AuthManager {
    constructor() {
        console.log('[Auth] Initializing AuthManager...');
        this.config = null;
        this.initializeAuth();
    }

    async initializeAuth() {
        try {
            // Load configuration
            if (window.configManager) {
                this.config = await window.configManager.getConfig();
            } else {
                console.warn('[Auth] configManager not available, using defaults');
                this.config = {
                    auth: {
                        tokenKey: 'authToken',
                        userKey: 'user',
                        autoLogoutDays: 7
                    }
                };
            }

            const authConfig = this.config.auth;
            console.log('[Auth] Using auth config:', authConfig);

            // Check localStorage contents
            const storedToken = localStorage.getItem(authConfig.tokenKey);
            const storedUser = localStorage.getItem(authConfig.userKey);

            console.log('[Auth] localStorage contents:', {
                storedToken: storedToken ? `${storedToken.substring(0, 20)}...` : 'none',
                storedUser: storedUser ? 'exists' : 'none',
                localStorageKeys: Object.keys(localStorage),
                tokenKey: authConfig.tokenKey,
                userKey: authConfig.userKey
            });

            this.token = storedToken;
            this.user = JSON.parse(storedUser || 'null');

            console.log('[Auth] Initial state:', {
                hasToken: !!this.token,
                hasUser: !!this.user,
                token: this.token ? `${this.token.substring(0, 20)}...` : 'none',
                user: this.user
            });

            this.setupAutoLogout();
        } catch (error) {
            console.error('[Auth] Error initializing auth:', error);
            this.token = null;
            this.user = null;
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        const isAuth = !!(this.token && this.user);
        console.log('[Auth] isAuthenticated check:', {
            hasToken: !!this.token,
            hasUser: !!this.user,
            isAuth
        });
        return isAuth;
    }

    // Get current user
    getCurrentUser() {
        return this.user;
    }

    // Get auth token
    getToken() {
        return this.token;
    }

    // Save auth data
    async setAuth(token, user) {
        console.log('[Auth] Setting auth data:', {
            token: token ? `${token.substring(0, 20)}...` : 'none',
            user
        });

        // Ensure config is loaded
        if (!this.config) {
            await this.initializeAuth();
        }

        const authConfig = this.config.auth;

        this.token = token;
        this.user = user;
        localStorage.setItem(authConfig.tokenKey, token);
        localStorage.setItem(authConfig.userKey, JSON.stringify(user));

        console.log('[Auth] Auth data saved to localStorage:', {
            tokenKey: authConfig.tokenKey,
            userKey: authConfig.userKey,
            tokenInStorage: !!localStorage.getItem(authConfig.tokenKey),
            userInStorage: !!localStorage.getItem(authConfig.userKey)
        });

        this.setupAutoLogout();
    }

    // Clear auth data
    clearAuth() {
        console.log('[Auth] Clearing auth data...');
        this.token = null;
        this.user = null;

        const authConfig = this.config?.auth || {
            tokenKey: 'authToken',
            userKey: 'user'
        };

        localStorage.removeItem(authConfig.tokenKey);
        localStorage.removeItem(authConfig.userKey);
        console.log('[Auth] Auth data cleared from localStorage');
    }

    // Setup auto logout when token expires
    setupAutoLogout() {
        // Simple timeout-based logout (7 days)
        if (this.token) {
            setTimeout(() => {
                this.logout();
            }, 7 * 24 * 60 * 60 * 1000); // 7 days
        }
    }

    // Login method
    async login(email, password, remember = false) {
        console.log('[Auth] Attempting login:', { email, remember });

        try {
            // Get API URL from config
            const loginUrl = window.getApiUrl ? await window.getApiUrl('login') : '/api/login';
            console.log('[Auth] Using login URL:', loginUrl);

            const response = await fetch(loginUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, remember })
            });

            const data = await response.json();

            console.log('[Auth] Login response:', {
                status: response.status,
                ok: response.ok,
                data: data
            });

            if (response.ok) {
                console.log('[Auth] Login successful, setting auth data...');
                await this.setAuth(data.token, data.user);
                return { success: true, data };
            } else {
                console.log('[Auth] Login failed:', data.message);
                return { success: false, error: data.message };
            }
        } catch (error) {
            console.error('[Auth] Login error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    // Register method
    async register(email, password, name) {
        try {
            const registerUrl = window.getApiUrl ? await window.getApiUrl('register') : '/api/register';
            console.log('[Auth] Using register URL:', registerUrl);

            const response = await fetch(registerUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, name })
            });

            const data = await response.json();

            if (response.ok) {
                await this.setAuth(data.token, data.user);
                return { success: true, data };
            } else {
                return { success: false, error: data.message };
            }
        } catch (error) {
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    // Logout method
    async logout() {
        try {
            const logoutUrl = window.getApiUrl ? await window.getApiUrl('logout') : '/api/logout';
            console.log('[Auth] Using logout URL:', logoutUrl);

            await fetch(logoutUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuth();
            window.location.href = '/login';
        }
    }

    // Check authentication status from server
    async checkAuth() {
        try {
            const meUrl = window.getApiUrl ? await window.getApiUrl('me') : '/api/me';
            console.log('[Auth] Using me URL:', meUrl);

            const response = await fetch(meUrl, {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.user = data.user;

                // Save to localStorage using config keys
                const authConfig = this.config?.auth || { userKey: 'user' };
                localStorage.setItem(authConfig.userKey, JSON.stringify(data.user));
                return true;
            } else {
                this.clearAuth();
                return false;
            }
        } catch (error) {
            console.error('Auth check error:', error);
            return false;
        }
    }

    // Protect route - redirect to login if not authenticated
    protectRoute() {
        console.log('[Auth] Protecting route, checking authentication...');
        const isAuth = this.isAuthenticated();

        if (!isAuth) {
            console.log('[Auth] Not authenticated, redirecting to login');
            window.location.href = '/login';
            return false;
        }

        console.log('[Auth] User is authenticated, allowing access');
        return true;
    }

    // Make authenticated API requests
    async authenticatedFetch(url, options = {}) {
        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${this.token}`
        };

        return fetch(url, {
            ...options,
            headers
        });
    }
}

// Create global auth instance
const auth = new AuthManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, auth };
} else {
    window.AuthManager = AuthManager;
    window.auth = auth;
}

// Debug function - can be called from browser console
window.debugAuth = async function() {
    const authConfig = auth.config?.auth || {
        tokenKey: 'authToken',
        userKey: 'user'
    };

    console.log('[Auth Debug] Current auth state:', {
        isAuth: auth.isAuthenticated(),
        token: auth.getToken(),
        user: auth.getCurrentUser(),
        localStorage: {
            token: localStorage.getItem(authConfig.tokenKey),
            user: localStorage.getItem(authConfig.userKey)
        },
        config: authConfig
    });
    return auth;
};

console.log('[Auth] Auth module loaded. Use debugAuth() in console to debug.');