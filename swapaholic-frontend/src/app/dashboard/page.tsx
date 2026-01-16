'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '../../store/hooks';

export default function DashboardRedirect() {
    const router = useRouter();
    const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);

    useEffect(() => {
        if (!isLoading) {
            if (!isAuthenticated) {
                router.push('/login');
            } else if (user) {
                if (user.role === 'seller') {
                    router.push('/seller/dashboard');
                } else if (user.role === 'admin') {
                    router.push('/admin/dashboard');
                } else {
                    // Default to buyer dashboard for buyers and others
                    router.push('/buyer/dashboard');
                }
            }
        }
    }, [isAuthenticated, user, isLoading, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
    );
}
