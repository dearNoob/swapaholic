// Token Management Utility

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export const tokenManager = {
    // Get access token
    getAccessToken(): string | null {
        if (typeof window === 'undefined') return null;
        const token = localStorage.getItem(ACCESS_TOKEN_KEY);
        // console.log('🔐 tokenManager getAccessToken:', !!token);
        return token;
    },

    // Get refresh token
    getRefreshToken(): string | null {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    },

    // Set tokens
    setTokens(accessToken: string, refreshToken: string): void {
        if (typeof window === 'undefined') return;
        console.log('🔐 tokenManager setTokens called');
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    },

    // Clear tokens
    clearTokens(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    },

    // Check if token is expired (simple check based on JWT structure)
    isTokenExpired(token: string): boolean {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiry = payload.exp * 1000; // Convert to milliseconds
            return Date.now() >= expiry;
        } catch (error) {
            return true;
        }
    },

    // Check if access token needs refresh (expires in < 5 minutes)
    shouldRefreshToken(): boolean {
        const token = this.getAccessToken();
        if (!token) return false;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expiry = payload.exp * 1000;
            const fiveMinutes = 5 * 60 * 1000;
            return Date.now() >= expiry - fiveMinutes;
        } catch (error) {
            return false;
        }
    }
};
