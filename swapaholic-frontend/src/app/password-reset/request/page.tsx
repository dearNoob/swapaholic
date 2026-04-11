// src/app/password-reset/request/page.tsx
'use client';

import { useState } from 'react';
import { authApi } from '@/api/auth';
import { useRouter } from 'next/navigation';
import { showSuccessToast, showErrorToast } from '@/utils/errorHandler';

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = error.response as { data?: { message?: string } };
        if (response?.data?.message) {
            return response.data.message;
        }
    }

    return fallback;
};

export default function PasswordResetRequestPage() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const router = useRouter();
    const [otp, setOtp] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await authApi.forgotPassword(email);
            setIsSubmitted(true);
            showSuccessToast(response.message || 'OTP sent to your email!');
        } catch (error: unknown) {
            const errorMessage = getErrorMessage(error, 'Failed to send OTP. Please try again.');
            showErrorToast(error, errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await authApi.verifyOTP({ email, otp, purpose: 'PASSWORD_RESET' });
            if (response.resetToken) {
                showSuccessToast('OTP Verified! Redirecting to reset password...');
                router.push(`/password-reset/${response.resetToken}`);
            } else {
                throw new Error('No reset token received');
            }
        } catch (error: unknown) {
            const errorMessage = getErrorMessage(error, 'Invalid OTP. Please try again.');
            showErrorToast(error, errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold mb-2"style={{color:"#3498db"}}>Reset Your Password</h1>
                <p className="text-gray-600 mb-6">
                    {!isSubmitted
                        ? "Enter your email address and we'll send you an OTP to reset your password."
                        : "Enter the OTP sent to your email."}
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
                            {isLoading ? 'Sending...' : 'Send OTP'}
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
                    <form onSubmit={handleOtpSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Enter OTP
                            </label>
                            <input
                                type="text"
                                placeholder="Enter 6-digit OTP"
                                style={{color:"#3498db"}}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                required
                                maxLength={6}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center tracking-widest text-xl"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Verifying...' : 'Verify OTP'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsSubmitted(false)}
                            className="w-full text-gray-600 hover:text-gray-800 text-sm font-medium"
                        >
                            Change Email
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
