'use client';

import React, { useState } from 'react';
import { FaShieldAlt, FaMobileAlt, FaKey, FaQrcode, FaCheck, FaTimes, FaCopy } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { authApi } from '../../api/auth';

type ErrorWithResponse = {
    response?: {
        data?: unknown;
    };
};

export default function TwoFactorAuth() {
    const [isEnabled, setIsEnabled] = useState(false);
    const [step, setStep] = useState<'disabled' | 'setup' | 'verify' | 'enabled'>('disabled');
    const [qrCode, setQrCode] = useState('');
    const [secret, setSecret] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);

    const handleEnable2FA = async () => {
        try {
            const data = await authApi.generate2FA();

            setSecret(data.secret);
            setQrCode(data.qrCode);
            setStep('setup');
        } catch (error) {
            console.error('2FA Generation Error:', error);
            toast.error('Failed to generate 2FA secret');
        }
    };

    const handleVerify = async () => {
        if (verificationCode.length !== 6) {
            toast.error('Please enter a 6-digit code');
            return;
        }

        try {
            const data = await authApi.verify2FA(verificationCode);
            setBackupCodes(data.backupCodes);
            setStep('verify');
            toast.success('2FA verified successfully!');
        } catch (error) {
            console.error('2FA Verification Error:', error);
            if (error && typeof error === 'object' && 'response' in error) {
                console.error('Server Response:', (error as ErrorWithResponse).response?.data);
            }
            toast.error('Invalid verification code');
        }
    };

    const handleComplete = () => {
        setIsEnabled(true);
        setStep('enabled');
        toast.success('Two-Factor Authentication enabled!');
    };

    const handleDisable = async () => {
        if (!window.confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
            return;
        }

        try {
            await authApi.disable2FA();
            setIsEnabled(false);
            setStep('disabled');
            setBackupCodes([]);
            toast.success('Two-Factor Authentication disabled');
        } catch (error) {
            toast.error('Failed to disable 2FA');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard!');
    };

    return (
        <div className="max-w-3xl space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FaShieldAlt className="text-indigo-600" />
                    Two-Factor Authentication
                </h2>
                <p className="text-gray-600 mt-1">
                    Add an extra layer of security to your account
                </p>
            </div>

            {/* Status Card */}
            {step === 'disabled' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-yellow-100 rounded-lg">
                            <FaShieldAlt className="text-yellow-600 text-2xl" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg mb-2">2FA is Currently Disabled</h3>
                            <p className="text-gray-600 mb-4">
                                Two-factor authentication adds an extra layer of security by requiring a verification code
                                from your phone in addition to your password.
                            </p>
                            <ul className="space-y-2 text-sm text-gray-600 mb-6">
                                <li className="flex items-center gap-2">
                                    <FaCheck className="text-green-600" />
                                    Protects against unauthorized access
                                </li>
                                <li className="flex items-center gap-2">
                                    <FaCheck className="text-green-600" />
                                    Works with Google Authenticator, Authy, and similar apps
                                </li>
                                <li className="flex items-center gap-2">
                                    <FaCheck className="text-green-600" />
                                    Provides backup codes for emergency access
                                </li>
                            </ul>
                            <button
                                onClick={handleEnable2FA}
                                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
                            >
                                Enable Two-Factor Authentication
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Enabled Status */}
            {step === 'enabled' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-green-100 rounded-lg">
                            <FaShieldAlt className="text-green-600 text-2xl" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg mb-2 flex items-center gap-2">
                                2FA is Enabled
                                <FaCheck className="text-green-600" />
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Your account is protected with two-factor authentication.
                            </p>
                            <button
                                onClick={handleDisable}
                                className="px-6 py-3 border-2 border-red-600 text-red-600 rounded-lg font-semibold hover:bg-red-50 transition"
                            >
                                Disable 2FA
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Setup Step */}
            {step === 'setup' && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 text-lg mb-4">Setup Two-Factor Authentication</h3>

                    <div className="space-y-6">
                        {/* Step 1: Download App */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
                                <h4 className="font-semibold text-gray-900">Download an Authenticator App</h4>
                            </div>
                            <p className="text-gray-600 ml-10">
                                Install Google Authenticator, Authy, or any compatible TOTP app on your phone.
                            </p>
                        </div>

                        {/* Step 2: Scan QR */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
                                <h4 className="font-semibold text-gray-900">Scan QR Code</h4>
                            </div>
                            <div className="ml-10 space-y-4">
                                <p className="text-gray-600">
                                    Open your authenticator app and scan this QR code:
                                </p>

                                {qrCode && (
                                    <div className="flex flex-col items-center gap-4 p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 max-w-xs">
                                        <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                                        <div className="text-center">
                                            <p className="text-sm text-gray-600 mb-2">Or enter this code manually:</p>
                                            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded border border-gray-300">
                                                <code className="text-sm font-mono">{secret}</code>
                                                <button
                                                    onClick={() => copyToClipboard(secret)}
                                                    className="p-1 hover:bg-gray-100 rounded transition"
                                                    title="Copy code"
                                                >
                                                    <FaCopy className="text-gray-500" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Step 3: Verify */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <span className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
                                <h4 className="font-semibold text-gray-900">Enter Verification Code</h4>
                            </div>
                            <div className="ml-10 space-y-4">
                                <p className="text-gray-600">
                                    Enter the 6-digit code from your authenticator app:
                                </p>
                                <div className="flex gap-3 items-center">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        style={{ color: 'black' }}
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                                        placeholder="000000"
                                        className="w-40 px-4 py-3 border border-gray-300 rounded-lg text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />

                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                onClick={() => {
                                    setStep('disabled');
                                    setVerificationCode('');
                                }}
                                className="px-6 py-3 border border-gray-300 rounded-lg font-bold hover:bg-blue-700 transition"
                                style={{ color: 'white', backgroundColor: '#900808ff' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleVerify}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                                style={{ color: 'white', backgroundColor: 'blue' }}
                            >
                                Verify
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Backup Codes */}
            {step === 'verify' && backupCodes.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 text-lg mb-4 flex items-center gap-2">
                        <FaKey className="text-indigo-600" />
                        Save Your Backup Codes
                    </h3>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <p className="text-yellow-900 font-semibold mb-2">⚠️ Important: Save these codes in a secure place</p>
                        <p className="text-sm text-yellow-800">
                            These backup codes can be used to access your account if you lose access to your authenticator app.
                            Each code can only be used once.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-6 p-6 bg-gray-50 rounded-lg border border-gray-300">
                        {backupCodes.map((code, index) => (
                            <div key={index} className="font-mono text-sm bg-white px-4 py-2 rounded border border-gray-200">
                                {code}
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => copyToClipboard(backupCodes.join('\n'))}
                            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition flex items-center gap-2"
                        >
                            <FaCopy />
                            Copy All Codes
                        </button>
                        <button
                            onClick={handleComplete}
                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition"
                        >
                            I&apos;ve Saved My Codes
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
