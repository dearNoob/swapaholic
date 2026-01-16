import { ApiError } from '../types/api';
import { toast } from 'react-toastify';

/**
 * Standard error handler for API errors
 * Extracts user-friendly error messages and displays them
 */
export const handleApiError = (error: any): string => {
    // Check if it's our standardized ApiError
    if (error.message && typeof error.message === 'string') {
        return error.message;
    }

    // Check for axios error response
    if (error.response?.data?.message) {
        return error.response.data.message;
    }

    // Check for validation errors
    if (error.errors && typeof error.errors === 'object') {
        const errorMessages = Object.values(error.errors).flat();
        return errorMessages.join(', ');
    }

    // Generic network error
    if (error.code === 'ECONNABORTED') {
        return 'Request timeout. Please try again.';
    }

    if (error.code === 'ERR_NETWORK') {
        return 'Network error. Please check your connection.';
    }

    // Fallback error message
    return error.message || 'An unexpected error occurred. Please try again.';
};

/**
 * Show error toast with standardized formatting
 */
export const showErrorToast = (error: any, customMessage?: string) => {
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
export const isNotFoundError = (error: any): boolean => {
    return error.status === 404 || error.response?.status === 404;
};

/**
 * Check if error is 401 Unauthorized
 */
export const isUnauthorizedError = (error: any): boolean => {
    return error.status === 401 || error.response?.status === 401;
};

/**
 * Check if error is 403 Forbidden
 */
export const isForbiddenError = (error: any): boolean => {
    return error.status === 403 || error.response?.status === 403;
};

/**
 * Check if error is validation error (422)
 */
export const isValidationError = (error: any): boolean => {
    return error.status === 422 || error.response?.status === 422;
};
