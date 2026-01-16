'use client';

import { Suspense } from 'react';
import { AdminLogin } from '../../../features/auth/AdminLogin';

export default function AdminLoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-900">Loading...</div>}>
            <AdminLogin />
        </Suspense>
    );
}
