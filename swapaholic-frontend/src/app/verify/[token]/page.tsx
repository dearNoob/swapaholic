// src/app/verify/[token]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { authApi } from '@/api/auth';
import { showSuccessToast, showErrorToast } from '@/utils/errorHandler';

export default function VerifyEmailPage() {
    const router = useRouter();
    const params = useParams();
    const token = typeof params?.token === 'string' ? params.token : '';
    const hasToken = Boolean(token);
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>(hasToken ? 'loading' : 'error');
    const [message, setMessage] = useState(hasToken ? 'Verifying your email...' : 'Invalid verification link');

    useEffect(() => {
        if (!token) {
            return;
        }

        const verify = async () => {
            try {
                const response = await authApi.verifyEmail(token);
                setStatus('success');
                setMessage(response.message || 'Email verified successfully!');
                showSuccessToast('Email verified! Redirecting to login...');

                // Redirect to login after 2 seconds
                const redirectTimeout = setTimeout(() => router.push('/login'), 2000);
                return () => clearTimeout(redirectTimeout);
            } catch (error) {
                setStatus('error');
                setMessage('Verification failed. The link may be invalid or expired.');
                showErrorToast(error);
            }
        };

        let cleanup: (() => void) | undefined;

        void verify().then((result) => {
            cleanup = result;
        });

        return () => {
            cleanup?.();
        };
    }, [token, router]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md w-full">
                <div className="mb-4">
                    {status === 'loading' && (
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                    )}
                    {status === 'success' && (
                        <div className="text-6xl text-green-500">✓</div>
                    )}
                    {status === 'error' && (
                        <div className="text-6xl text-red-500">✗</div>
                    )}
                </div>

                <h1 className="text-2xl font-bold mb-2">Email Verification</h1>
                <p className={`${status === 'error' ? 'text-red-600' : 'text-gray-700'}`}>
                    {message}
                </p>

                {status === 'error' && (
                    <button
                        onClick={() => router.push('/')}
                        className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                        Go to Homepage
                    </button>
                )}
            </div>
        </div>
    );
}
