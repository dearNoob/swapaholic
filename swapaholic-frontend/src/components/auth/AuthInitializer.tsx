'use client';

import { useEffect, useRef } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials, setLoading } from '../../store/authSlice';
import { useRouteGuard } from '../../hooks/useRouteGuard';

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const hasInitialized = useRef(false);

    useRouteGuard();

    useEffect(() => {
        if (hasInitialized.current) {
            return;
        }

        hasInitialized.current = true;

        const token = localStorage.getItem('accessToken');
        const userStr = localStorage.getItem('user');

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);

                dispatch(setCredentials({
                    accessToken: token,
                    user,
                }));
            } catch (error) {
                console.error('AuthInitializer: Failed to parse user from localStorage:', error);
                localStorage.removeItem('accessToken');
                localStorage.removeItem('user');
            }
        }

        dispatch(setLoading(false));
    }, [dispatch]);

    return <>{children}</>;
}
