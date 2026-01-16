import React from 'react';
import { useAppSelector } from '../../store/hooks';
import { BuyerDashboard } from '../buyer/BuyerDashboard';
import { SellerDashboard } from '../seller/SellerDashboard';
import { useRouter } from 'next/navigation';

export const Dashboard = () => {
    const { user, isAuthenticated, isLoading } = useAppSelector((state) => state.auth);
    const router = useRouter();

    React.useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            console.log('🔒 User not authenticated, redirecting to login...');
            router.push('/login');
        } else if (!isLoading && isAuthenticated) {
            console.log('✅ User authenticated:', user);
        }
    }, [isLoading, isAuthenticated, router, user]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!user) {
        return null; // Will redirect
    }

    switch (user.role) {
        case 'buyer':
            return <BuyerDashboard />;
        case 'seller':
            return <SellerDashboard />;
        case 'verifier':
            return (
                <div className="p-8 text-center">
                    <h1 className="text-2xl font-bold">Verifier Dashboard</h1>
                    <p className="mt-4">Coming soon...</p>
                </div>
            );
        case 'delivery':
            return (
                <div className="p-8 text-center">
                    <h1 className="text-2xl font-bold">Delivery Dashboard</h1>
                    <p className="mt-4">Coming soon...</p>
                </div>
            );
        case 'admin':
            return (
                <div className="p-8 text-center">
                    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                    <p className="mt-4">Coming soon...</p>
                </div>
            );
        default:
            return (
                <div className="p-8 text-center">
                    <h1 className="text-2xl font-bold">Unknown Role</h1>
                </div>
            );
    }
};
