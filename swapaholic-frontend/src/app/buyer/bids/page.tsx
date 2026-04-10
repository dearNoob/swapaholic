'use client';

import { MyBids } from '../../../features/buyer/MyBids';
import MainLayout from '../../../components/layout/MainLayout';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Buyer Bids Page
 * Route: /buyer/bids
 */
export default function BuyerBidsPage() {
    const { isAuthenticated, isLoading, user } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login?redirect=/buyer/bids');
        }
        
        if (isAuthenticated && user?.role === 'admin') {
            router.push('/admin/dashboard');
        }
    }, [isAuthenticated, isLoading, user, router]);

    if (isLoading || !isAuthenticated) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <MainLayout>
            <div className="py-6">
                <MyBids />
            </div>
        </MainLayout>
    );
}
