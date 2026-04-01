'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaLock, FaShieldAlt, FaCreditCard, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import Image from 'next/image';

// We can define types here or import
interface GatewaySession {
    amount: number;
    currency: string;
    merchantName: string;
    orderId: string;
}

export default function PaymentGatewayPage({ params }: { params: { sessionId: string } }) {
    const router = useRouter();
    const { sessionId } = params;

    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [sessionData, setSessionData] = useState<GatewaySession | null>(null);
    const [error, setError] = useState('');

    const [selectedMethod, setSelectedMethod] = useState<'card' | 'bkash' | 'nagad'>('card');
    // Form stats
    const [cardNumber, setCardNumber] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [pin, setPin] = useState('');

    // Fetch Session Data
    useEffect(() => {
        const fetchSession = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payments/mock/session/${sessionId}`);
                const data = await res.json();

                if (data.success) {
                    setSessionData(data);
                } else {
                    setError(data.message || 'Invalid Session');
                }
            } catch (err) {
                setError('Connection Error');
            } finally {
                setLoading(false);
            }
        };

        if (sessionId) fetchSession();
    }, [sessionId]);

    const handlePayment = async (action: 'success' | 'fail' | 'cancel') => {
        setProcessing(true);
        try {
            // Simulate network delay for "realism"
            await new Promise(r => setTimeout(r, 2000));

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payments/mock/process`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionKey: sessionId,
                    method: selectedMethod,
                    accountNumber: selectedMethod === 'card' ? cardNumber : mobileNumber,
                    action
                })
            });

            const data = await res.json();

            if (data.success && data.redirectUrl) {
                // Redirect back to main site
                window.location.href = data.redirectUrl;
            } else {
                setError(data.message || 'Payment Failed');
                setProcessing(false);
            }

        } catch (err) {
            setError('Payment Processing Error');
            setProcessing(false);
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center bg-gray-100">Loading Secure Gateway...</div>;
    if (error) return <div className="flex h-screen items-center justify-center text-red-600 bg-gray-100">{error}</div>;

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Header */}
            <header className="bg-white shadow-sm py-4 px-6 flex justify-between items-center border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <FaShieldAlt className="text-green-600 text-2xl" />
                    <h1 className="text-xl font-bold text-gray-800">SecurePay <span className="text-xs font-normal text-gray-500">Trusted Gateway</span></h1>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <FaLock />
                    <span>256-bit SSL Encrypted</span>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8 flex justify-center items-start">
                <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl overflow-hidden flex flex-col md:flex-row">

                    {/* Order Summary Sidebar */}
                    <div className="bg-slate-800 text-white p-6 md:w-1/3 space-y-6">
                        <div>
                            <p className="text-slate-400 text-sm">Merchant</p>
                            <p className="font-semibold text-lg">{sessionData?.merchantName}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 text-sm">Order ID</p>
                            <p className="font-mono">{sessionData?.orderId}</p>
                        </div>
                        <div className="pt-6 border-t border-slate-700">
                            <p className="text-slate-400 text-sm">Total Amount</p>
                            <p className="text-3xl font-bold">{sessionData?.currency} {sessionData?.amount}</p>
                        </div>
                    </div>

                    {/* Payment Form */}
                    <div className="p-6 md:w-2/3">
                        <h2 className="text-lg font-semibold mb-4">Select Payment Method</h2>

                        {/* Method Tabs */}
                        <div className="flex gap-4 mb-6">
                            <button
                                onClick={() => setSelectedMethod('card')}
                                className={`flex-1 p-3 border rounded-lg flex flex-col items-center gap-2 transition ${selectedMethod === 'card' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-blue-300'}`}
                            >
                                <FaCreditCard className="text-xl" />
                                <span className="text-sm font-medium">Card</span>
                            </button>
                            <button
                                onClick={() => setSelectedMethod('bkash')}
                                className={`flex-1 p-3 border rounded-lg flex flex-col items-center gap-2 transition ${selectedMethod === 'bkash' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 hover:border-pink-300'}`}
                            >
                                <span className="font-bold text-xl">bKs</span>
                                <span className="text-sm font-medium">bKash</span>
                            </button>
                            <button
                                onClick={() => setSelectedMethod('nagad')}
                                className={`flex-1 p-3 border rounded-lg flex flex-col items-center gap-2 transition ${selectedMethod === 'nagad' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 hover:border-orange-300'}`}
                            >
                                <span className="font-bold text-xl">Nag</span>
                                <span className="text-sm font-medium">Nagad</span>
                            </button>
                        </div>

                        {/* Dynamic Form Fields */}
                        <div className="space-y-4 mb-8">
                            {selectedMethod === 'card' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                                        <input
                                            type="text"
                                            placeholder="0000 0000 0000 0000"
                                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none transition"
                                            value={cardNumber}
                                            onChange={(e) => setCardNumber(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry</label>
                                            <input
                                                type="text"
                                                placeholder="MM/YY"
                                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none transition"
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">CVC</label>
                                            <input
                                                type="text"
                                                placeholder="123"
                                                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none transition"
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                                        <input
                                            type="text"
                                            placeholder="017XXXXXXXX"
                                            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none transition"
                                            value={mobileNumber}
                                            onChange={(e) => setMobileNumber(e.target.value)}
                                        />
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">{selectedMethod === 'card' ? 'PIN' : 'PIN / OTP'}</label>
                                <input
                                    type="password"
                                    placeholder="****"
                                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Action Buttons - Simulation Controls */}
                        <div className="space-y-3">
                            <button
                                onClick={() => handlePayment('success')}
                                disabled={processing}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow transition flex justify-center items-center gap-2"
                            >
                                {processing ? 'Processing...' : `Pay BDT ${sessionData?.amount}`}
                            </button>

                            <div className="flex gap-3 pt-4 border-t border-gray-100">
                                <button
                                    onClick={() => handlePayment('fail')}
                                    disabled={processing}
                                    className="flex-1 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded text-sm font-medium transition"
                                >
                                    Simulate Failure
                                </button>
                                <button
                                    onClick={() => handlePayment('cancel')}
                                    disabled={processing}
                                    className="flex-1 py-2 border border-gray-300 text-gray-500 hover:bg-gray-100 rounded text-sm font-medium transition"
                                >
                                    Cancel Payment
                                </button>
                            </div>
                            <p className="text-xs text-center text-gray-400 mt-2">
                                * This is a Simulated Payment Gateway for demonstration. No real money is charged.
                            </p>
                        </div>

                    </div>
                </div>
            </main>

            <footer className="py-4 text-center text-gray-400 text-xs">
                &copy; 2024 SecurePay Gateway Ltd. All Rights Reserved.
            </footer>
        </div>
    );
}
