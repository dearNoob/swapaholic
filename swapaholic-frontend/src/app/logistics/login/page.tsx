'use client';

import { Suspense } from 'react';
import { LogisticsLogin } from '../../../features/auth/LogisticsLogin';

export default function LogisticsLoginPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900">Loading...</div>}>
            <LogisticsLogin />
        </Suspense>
    );
}
