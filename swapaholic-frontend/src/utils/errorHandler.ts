import { toast } from 'react-toastify';
import { ApiError } from '../types/api';

type ErrorLike = Partial<ApiError> & {
    response?: {
        status?: number;
        data?: {
            message?: string;
        };
    };
};

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const toErrorLike = (error: unknown): ErrorLike => {
    if (!isObject(error)) {
        return {};
    }

    return error as ErrorLike;
};

/**
 * Standard error handler for API errors
 * Extracts user-friendly error messages and displays them
 */
export const handleApiError = (error: unknown): string => {
    const normalizedError = toErrorLike(error);

    // Check for axios error response
    if (normalizedError.response?.data?.message) {
        return normalizedError.response.data.message;
    }

    // Check if it's our standardized ApiError
    if (normalizedError.message && typeof normalizedError.message === 'string') {
        return normalizedError.message;
    }

    // Check for validation errors
    if (normalizedError.errors && typeof normalizedError.errors === 'object') {
        const errorMessages = Object.values(normalizedError.errors).flat();
        return errorMessages.join(', ');
    }

    // Generic network error
    if (normalizedError.code === 'ECONNABORTED') {
        return 'Request timeout. Please try again.';
    }

    if (normalizedError.code === 'ERR_NETWORK') {
        return 'Network error. Please check your connection.';
    }

    // Fallback error message
    return normalizedError.message || 'An unexpected error occurred. Please try again.';
};

/**
 * Show error toast with standardized formatting
 */
export const showErrorToast = (error: unknown, customMessage?: string) => {
    const errorMessage = customMessage || handleApiError(error);
    toast.error(errorMessage, {
        position: 'top-right',
        autoClose: 5000
    });
};

/**
 * Show success toast
 */
export const showSuccessToast = (message: string) => {
    toast.success(message, {
        position: 'top-right',
        autoClose: 3000
    });
};

/**
 * Check if error is 404 Not Found
 */
export const isNotFoundError = (error: unknown): boolean => {
    const normalizedError = toErrorLike(error);
    return normalizedError.status === 404 || normalizedError.response?.status === 404;
};

/**
 * Check if error is 401 Unauthorized
 */
export const isUnauthorizedError = (error: unknown): boolean => {
    const normalizedError = toErrorLike(error);
    return normalizedError.status === 401 || normalizedError.response?.status === 401;
};

/**
 * Check if error is 403 Forbidden
 */
export const isForbiddenError = (error: unknown): boolean => {
    const normalizedError = toErrorLike(error);
    return normalizedError.status === 403 || normalizedError.response?.status === 403;
};

/**
 * Check if error is validation error (422)
 */
export const isValidationError = (error: unknown): boolean => {
    const normalizedError = toErrorLike(error);
    return normalizedError.status === 422 || normalizedError.response?.status === 422;
};
