import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { tokenManager } from '../utils/tokenManager';
import { ApiError, TokenPair } from '../types/api';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api',
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json'
    },
    withCredentials: true
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = tokenManager.getAccessToken();

        // Debug logging for analyze request
        if (config.url?.includes('/products/analyze')) {
            console.log('🔍 Analyze Request - Token available:', !!token);
            console.log('🔍 Analyze Request - Token length:', token?.length);
        }

        // Ensure headers object exists
        if (!config.headers) {
            config.headers = {} as any;
        }

        if (token) {
            (config.headers as any).Authorization = `Bearer ${token}`;
        }

        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

// Track if refresh is in progress to avoid multiple refresh calls
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (reason?: any) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};
// Response interceptor - handle errors and token refresh
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        // If unauthorized, attempt token refresh unless request is for analyze endpoint
        if (error.response?.status === 401 && !originalRequest._retry) {
            // Skip redirect for analyze endpoint; let UI handle error
            if (originalRequest.url && originalRequest.url.includes('/products/analyze')) {
                return Promise.reject(error);
            }
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        if (originalRequest.headers) {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                        }
                        return apiClient(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }
            isRefreshing = true;
            try {
                // Call refresh token endpoint. The HTTP-only cookie will be sent automatically.
                const resp = await axios.post(
                    `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5000/api'}/auth/refresh-token`,
                    {},
                    { withCredentials: true }
                );
                
                // Backend returns: { success: true, data: { accessToken, user } }
                const accessToken = resp.data?.data?.accessToken;
                
                if (!accessToken) {
                    throw new Error('No access token in refresh response');
                }

                tokenManager.setTokens(accessToken);
                
                if (originalRequest.headers) {
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                }
                
                processQueue(null, accessToken);
                isRefreshing = false;
                return apiClient(originalRequest);
            } catch (refreshError) {
                processQueue(refreshError as any, null);
                tokenManager.clearTokens();
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
                isRefreshing = false;
                return Promise.reject(refreshError);
            }
        }
        const apiError = {
            status: error.response?.status || 500,
            message: error.response?.data?.message || error.message || 'An unexpected error occurred',
            errors: error.response?.data?.errors,
            code: error.response?.data?.code,
        };
        return Promise.reject(apiError);
    }
);




export default apiClient;
