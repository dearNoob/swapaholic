'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials, setLoading } from '../../store/authSlice';
import { useRouteGuard } from '../../hooks/useRouteGuard';

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const [isHydrated, setIsHydrated] = useState(false);

    // Enforce strict route isolation
    useRouteGuard();

    useEffect(() => {
        // Hydrate auth state from localStorage on client mount
        const token = localStorage.getItem('accessToken');
        const userStr = localStorage.getItem('user');



        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);

                dispatch(setCredentials({
                    accessToken: token,
                    user: user
                }));
            } catch (error) {
                console.error('❌ AuthInitializer: Failed to parse user from localStorage:', error);
                localStorage.removeItem('accessToken');
                localStorage.removeItem('user');
            }
        } else {

        }
        setIsHydrated(true);
        dispatch(setLoading(false));

    }, [dispatch]);

    if (!isHydrated) {
        return null; // Or a loading spinner
    }

    return <>{children}</>;
}
