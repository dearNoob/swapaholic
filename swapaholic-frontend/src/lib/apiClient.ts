import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, API_ORIGIN, resolvePublicAssetUrl } from './publicUrls';
import { tokenManager } from '../utils/tokenManager';
type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };
type ApiErrorPayload = {
    message?: string;
    errors?: unknown;
    code?: string;
};

const getErrorPayload = (error: AxiosError): ApiErrorPayload => {
    const data = error.response?.data;

    if (data && typeof data === 'object') {
        return data as ApiErrorPayload;
    }

    return {};
};

// Create axios instance
const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000,
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

        if (token) {
            config.headers.set('Authorization', `Bearer ${token}`);
        }

        return config;
    },
    (error: AxiosError) => Promise.reject(error)
);

// Track if refresh is in progress to avoid multiple refresh calls
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value?: string | null) => void;
    reject: (reason?: unknown) => void;
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
// Recursive function to automatically convert relative image paths from the DB into full API URLs
function transformImageUrls(obj: unknown, baseUrl: string): unknown {
    if (!obj) return obj;
    if (typeof obj === 'string') {
        return resolvePublicAssetUrl(obj);
    }
    if (Array.isArray(obj)) {
        return obj.map((item) => transformImageUrls(item, baseUrl));
    }
    if (typeof obj === 'object' && !(obj instanceof Date)) {
        const transformedObject = obj as Record<string, unknown>;
        for (const key in transformedObject) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                transformedObject[key] = transformImageUrls(transformedObject[key], baseUrl);
            }
        }
        return transformedObject;
    }
    return obj;
}

// Response interceptor - handle errors and token refresh
apiClient.interceptors.response.use(
    (response) => {
        response.data = transformImageUrls(response.data, API_ORIGIN);
        return response;
    },
    async (error: AxiosError) => {
        const errorPayload = getErrorPayload(error);
        const originalRequest = error.config as RetriableRequestConfig | undefined;
        // If unauthorized, attempt token refresh unless request is for analyze endpoint
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
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
                    `${API_BASE_URL}/auth/refresh-token`,
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
                processQueue(refreshError as AxiosError, null);
                tokenManager.clearTokens();
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
                isRefreshing = false;
                return Promise.reject(refreshError);
            }
        }
        const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
        const apiError = {
            status: error.response?.status || (isTimeout ? 408 : 500),
            message: isTimeout 
                ? 'The server is taking too long to respond. This usually happens if the backend is starting up. Please try again in 30 seconds.'
                : (errorPayload.message || error.message || 'An unexpected error occurred'),
            errors: errorPayload.errors,
            code: errorPayload.code || (isTimeout ? 'TIMEOUT' : undefined),
        };
        return Promise.reject(apiError);
    }
);




export default apiClient;
