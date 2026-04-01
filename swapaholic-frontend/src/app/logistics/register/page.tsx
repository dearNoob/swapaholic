'use client';

import { Suspense } from 'react';
import { LogisticsRegister } from '../../../features/auth/LogisticsRegister';

export default function LogisticsRegisterPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-900">Loading...</div>}>
            <LogisticsRegister />
        </Suspense>
    );
}
