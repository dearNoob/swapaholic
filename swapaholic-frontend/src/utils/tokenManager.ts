// Token Management Utility

const ACCESS_TOKEN_KEY = 'accessToken';

export const tokenManager = {
    // Get access token
    getAccessToken(): string | null {
        if (typeof window === 'undefined') return null;
        const token = localStorage.getItem(ACCESS_TOKEN_KEY);
        // console.log('🔐 tokenManager getAccessToken:', !!token);
        return token;
    },

    // Get refresh token (not stored in localStorage as it's an HTTP-only cookie)
    getRefreshToken(): string | null {
        return null; // The backend handles it via cookie
    },

    // Set tokens
    setTokens(accessToken: string): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    },

    // Clear tokens
    clearTokens(): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(ACCESS_TOKEN_KEY);
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
