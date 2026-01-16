// src/app/password-reset/[token]/page.tsx
'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { emailApi } from '@/api/email';

export default function PasswordResetPage() {
    const router = useRouter();
    const params = useParams();
    const token = params?.token as string;
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setStatus('Passwords do not match');
            return;
        }
        try {
            // Backend should verify token and set new password; we just call placeholder API
            await emailApi.passwordReset('', token); // token contains necessary info
            setStatus('Password has been reset successfully.');
            setTimeout(() => router.push('/'), 2000);
        } catch (err) {
            setStatus('Failed to reset password. Please try again or request a new reset link.');
        }
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded shadow-md">
            <h1 className="text-2xl font-bold mb-4">Set New Password</h1>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input
                    type="password"
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full border rounded px-3 py-2"
                />
                <input
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full border rounded px-3 py-2"
                />
                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
                >
                    Reset Password
                </button>
                {status && <p className="mt-2 text-sm">{status}</p>}
            </form>
        </div>
    );
}
