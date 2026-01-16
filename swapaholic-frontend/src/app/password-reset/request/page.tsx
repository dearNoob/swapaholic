// src/app/password-reset/request/page.tsx
'use client';

import { useState } from 'react';
import { authApi } from '@/api/auth';
import { useRouter } from 'next/navigation';
import { showSuccessToast, showErrorToast } from '@/utils/errorHandler';

export default function PasswordResetRequestPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await authApi.forgotPassword(email);
            setIsSubmitted(true);
            showSuccessToast(response.message || 'Password reset email sent!');
        } catch (error) {
            showErrorToast(error, 'Failed to send reset email. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-2">Reset Your Password</h1>
                <p className="text-gray-600 mb-6">
                    Enter your email address and we'll send you a link to reset your password.
                </p>

                {!isSubmitted ? (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </button>

                        <button
                            type="button"
                            onClick={() => router.push('/login')}
                            className="w-full text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                        >
                            Back to Login
                        </button>
                    </form>
                ) : (
                    <div className="text-center">
                        <div className="text-6xl text-green-500 mb-4">✓</div>
                        <h2 className="text-xl font-semibold mb-2">Check Your Email</h2>
                        <p className="text-gray-600 mb-6">
                            We've sent a password reset link to <strong>{email}</strong>
                        </p>
                        <button
                            onClick={() => router.push('/login')}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                        >
                            Back to Login
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
