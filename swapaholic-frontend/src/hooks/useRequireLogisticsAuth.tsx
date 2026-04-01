'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '../store/hooks';
import { toast } from 'react-toastify';

export const useRequireLogisticsAuth = (redirectPath = '/logistics/login') => {
    const router = useRouter();
    const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

    useEffect(() => {
        if (isLoading) return;

        const hasLocalAuth = typeof window !== 'undefined' &&
            localStorage.getItem('accessToken') &&
            localStorage.getItem('user');

        if (!isAuthenticated && !hasLocalAuth) {
            console.log('🚫 useRequireLogisticsAuth: Not authenticated, redirecting to login');
            router.replace(redirectPath);
            return;
        }

        if (user && user.role !== 'logistics_officer') {
            console.log(`🚫 useRequireLogisticsAuth: User role '${user.role}' is not logistics_officer, redirecting`);
            toast.error('Access denied. Logistics officer privileges required.');
            router.replace('/');
        }

    }, [isAuthenticated, isLoading, user, router, redirectPath]);

    return { isLoading, isAuthenticated, user, isLogistics: user?.role === 'logistics_officer' };
};
