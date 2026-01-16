'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials, setLoading } from '../../store/authSlice';

export default function AuthInitializer({ children }: { children: React.ReactNode }) {
    const dispatch = useAppDispatch();
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        // Hydrate auth state from localStorage on client mount
        const token = localStorage.getItem('accessToken');
        const userStr = localStorage.getItem('user');

        console.log('🔄 AuthInitializer: Reading from localStorage:', {
            hasToken: !!token,
            hasUser: !!userStr,
            token: token?.substring(0, 20) + '...',
            user: userStr?.substring(0, 50) + '...'
        });

        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                console.log('✅ AuthInitializer: Hydrating auth state:', { user, token: token.substring(0, 20) + '...' });
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
            console.log('⚠️ AuthInitializer: No auth data in localStorage');
        }
        setIsHydrated(true);
        dispatch(setLoading(false));
        console.log('✅ AuthInitializer: Hydration complete');
    }, [dispatch]);

    if (!isHydrated) {
        return null; // Or a loading spinner
    }

    return <>{children}</>;
}
