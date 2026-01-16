'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '../store/hooks';

export const useRequireAuth = (redirectPath = '/login') => {
    const router = useRouter();
    const { isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

    useEffect(() => {
        console.log('🛡️ useRequireAuth check:', { isLoading, isAuthenticated, path: window.location.pathname });
        if (!isLoading && !isAuthenticated) {
            console.log('🚫 useRequireAuth: Redirecting to login');
            router.replace(redirectPath);
        }
    }, [isAuthenticated, isLoading, router, redirectPath]);
};
