'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '../../store/hooks';

export default function AuthRedirect() {
    const { user, isAuthenticated, isLoading } = useAppSelector((state: any) => state.auth);
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && isAuthenticated && user) {
            if (user.role === 'logistics_officer') {
                router.replace('/logistics/dashboard');
            } else if (user.role === 'admin') {
                router.replace('/admin/dashboard');
            }
        }
    }, [isLoading, isAuthenticated, user, router]);

    return null;
}
