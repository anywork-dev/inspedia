// Configuration loader for Inspedia
class ConfigManager {
    constructor() {
        this.config = null;
        this.loadPromise = null;
    }

    async loadConfig() {
        if (this.loadPromise) {
            return this.loadPromise;
        }

        this.loadPromise = new Promise(async (resolve, reject) => {
            try {
                // Try to load config from config.json
                const response = await fetch('/config.json');
                if (response.ok) {
                    const config = await response.json();
                    this.config = config;
                    console.log('[Config] Configuration loaded from config.json:', config);
                } else {
                    // Fallback to default configuration
                    this.config = this.getDefaultConfig();
                    console.log('[Config] Using default configuration');
                }
                resolve(this.config);
            } catch (error) {
                console.warn('[Config] Failed to load config.json, using defaults:', error);
                this.config = this.getDefaultConfig();
                resolve(this.config);
            }
        });

        return this.loadPromise;
    }

    getDefaultConfig() {
        return {
            api: {
                baseUrl: window.location.origin,
                endpoints: {
                    login: "/api/login",
                    register: "/api/register",
                    logout: "/api/logout",
                    me: "/api/me",
                    generateIdea: "/api/generate-idea"
                }
            },
            app: {
                name: "Inspedia",
                version: "1.0.0",
                description: "Your personal space to discover, develop, and launch your next great idea"
            },
            auth: {
                tokenKey: "authToken",
                userKey: "user",
                autoLogoutDays: 7
            }
        };
    }

    async getApiUrl(endpoint) {
        await this.loadConfig();
        const baseUrl = this.config.api.baseUrl;
        const endpointPath = this.config.api.endpoints[endpoint];

        if (!endpointPath) {
            throw new Error(`Unknown API endpoint: ${endpoint}`);
        }

        // Remove trailing slash from baseUrl if it exists
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        // Ensure endpoint starts with /
        const cleanEndpoint = endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`;

        return `${cleanBaseUrl}${cleanEndpoint}`;
    }

    async getConfig() {
        await this.loadConfig();
        return this.config;
    }

    getAuthConfig() {
        return this.config?.auth || this.getDefaultConfig().auth;
    }
}

// Create global config instance
const configManager = new ConfigManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ConfigManager, configManager };
} else {
    window.ConfigManager = ConfigManager;
    window.configManager = configManager;
}

// Also provide a simple async function for getting API URLs
window.getApiUrl = (endpoint) => configManager.getApiUrl(endpoint);