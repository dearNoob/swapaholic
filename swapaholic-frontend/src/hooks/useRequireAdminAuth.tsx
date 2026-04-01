'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '../store/hooks';
import { toast } from 'react-toastify';

export const useRequireAdminAuth = (redirectPath = '/login') => {
    const router = useRouter();
    const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

    useEffect(() => {
        // Wait for loading to complete before checking auth
        if (isLoading) return;

        // Check 1: Is user authenticated?
        // We also check localStorage as a fallback to prevent premature redirects during hydration
        const hasLocalAuth = typeof window !== 'undefined' &&
            localStorage.getItem('accessToken') &&
            localStorage.getItem('user');

        if (!isAuthenticated && !hasLocalAuth) {
            console.log('🚫 useRequireAdminAuth: Not authenticated, redirecting to login');
            router.replace(redirectPath);
            return;
        }

        // Check 2: Does user have admin role?
        // Note: If you want to allow moderators too, change this condition
        // e.g. if (user && !['admin', 'moderator'].includes(user.role))
        if (user && user.role !== 'admin') {
            console.log(`🚫 useRequireAdminAuth: User role '${user.role}' is not admin, redirecting`);
            toast.error('Access denied. Admin privileges required.');
            router.replace('/');
        }

    }, [isAuthenticated, isLoading, user, router, redirectPath]);

    return { isLoading, isAuthenticated, user, isAdmin: user?.role === 'admin' };
};
