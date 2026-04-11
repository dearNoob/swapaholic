const LOCAL_API_ORIGIN = 'http://localhost:5000';
const LOCAL_API_BASE_URL = `${LOCAL_API_ORIGIN}/api`;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const normalizeApiBaseUrl = (value?: string) => {
    if (!value) {
        return LOCAL_API_BASE_URL;
    }

    const trimmed = trimTrailingSlash(value);
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

export const API_BASE_URL = normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');
export const SOCKET_URL = trimTrailingSlash(process.env.NEXT_PUBLIC_SOCKET_URL || API_ORIGIN || LOCAL_API_ORIGIN);

export const resolveApiPath = (path: string) => {
    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
};

export const resolveBackendPath = (path: string) => {
    if (/^https?:\/\//i.test(path)) {
        return path;
    }

    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_ORIGIN}${normalizedPath}`;
};

export const resolvePublicAssetUrl = (value?: string | null) => {
    if (!value) {
        return '';
    }

    if (
        /^(https?:)?\/\//i.test(value) ||
        value.startsWith('data:') ||
        value.startsWith('blob:')
    ) {
        return value;
    }

    if (value.startsWith('/uploads/')) {
        return resolveBackendPath(value);
    }

    if (value.startsWith('uploads/')) {
        return resolveBackendPath(`/${value}`);
    }

    return value;
};
