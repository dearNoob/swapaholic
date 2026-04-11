'use client';

import { useEffect, useRef } from 'react';
import axios from 'axios';
import { useAppDispatch } from '../../store/hooks';
import { setActiveMode, setCredentials, setLoading } from '../../store/authSlice';
import { useRouteGuard } from '../../hooks/useRouteGuard';
import { API_BASE_URL } from '../../lib/publicUrls';
import { tokenManager } from '../../utils/tokenManager';

const clearStoredAuth = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
};

const parseStoredUser = (userStr: string | null) => {
    if (!userStr || userStr === 'undefined' || userStr === 'null') {
        return null;
    }

    try {
        return JSON.parse(userStr);
    } catch (error) {
        console.error('AuthInitializer: Failed to parse user from localStorage:', error);
        clearStoredAuth();
        return null;
    }
};

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const hasInitialized = useRef(false);

    useRouteGuard();

    useEffect(() => {
        if (hasInitialized.current) {
            return;
        }

        hasInitialized.current = true;

        const initializeAuth = async () => {
            try {
                const savedMode = localStorage.getItem('activeMode');
                if (savedMode === 'buyer' || savedMode === 'seller') {
                    dispatch(setActiveMode(savedMode));
                }

                const token = localStorage.getItem('accessToken');
                const user = parseStoredUser(localStorage.getItem('user'));

                if (!token || !user) {
                    if (token || localStorage.getItem('user')) {
                        clearStoredAuth();
                    }
                    return;
                }

                if (!tokenManager.isTokenExpired(token)) {
                    dispatch(setCredentials({
                        accessToken: token,
                        user,
                    }));
                    return;
                }

                try {
                    const response = await axios.post(
                        `${API_BASE_URL}/auth/refresh-token`,
                        {},
                        { withCredentials: true }
                    );

                    const refreshPayload = response.data?.data;
                    if (refreshPayload?.accessToken && refreshPayload?.user) {
                        dispatch(setCredentials({
                            accessToken: refreshPayload.accessToken,
                            user: refreshPayload.user,
                        }));
                        return;
                    }

                    clearStoredAuth();
                } catch {
                    console.warn('AuthInitializer: Stored token is expired and refresh failed.');
                    clearStoredAuth();
                }
            } finally {
                dispatch(setLoading(false));
            }
        };

        void initializeAuth();
    }, [dispatch]);

    return <>{children}</>;
}
