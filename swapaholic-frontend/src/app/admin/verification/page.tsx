'use client';

import { useRequireAdminAuth } from '../../../hooks/useRequireAdminAuth';
import { AdminVerificationPanel } from '../../../features/verification/AdminVerificationPanel';

export default function AdminVerificationPage() {
    // Protect route with admin auth
    const { isLoading, isAdmin } = useRequireAdminAuth();

    if (isLoading || !isAdmin) {
        return (
            <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
                    <p className="text-gray-600">Checking authorization...</p>
                </div>
            </div>
        );
    }

    return <AdminVerificationPanel />;
}
