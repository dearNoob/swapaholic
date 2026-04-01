'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';
import Link from 'next/link';

export default function PaymentStatusPage() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const status = searchParams.get('status');
    const trxId = searchParams.get('trxId');

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">

                    {status === 'success' && (
                        <div className="space-y-6">
                            <FaCheckCircle className="mx-auto h-16 w-16 text-green-500" />
                            <h2 className="text-2xl font-bold text-gray-900">Payment Successful!</h2>
                            <p className="text-gray-500">
                                Thank you for your payment. Your transaction has been completed securely.
                            </p>
                            {trxId && (
                                <div className="bg-gray-100 p-3 rounded text-sm font-mono text-gray-700">
                                    Transaction ID: {trxId}
                                </div>
                            )}
                            <div className="mt-6">
                                <Link href="/buyer/dashboard" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                    Go to Dashboard
                                </Link>
                            </div>
                        </div>
                    )}

                    {status === 'failed' && (
                        <div className="space-y-6">
                            <FaTimesCircle className="mx-auto h-16 w-16 text-red-500" />
                            <h2 className="text-2xl font-bold text-gray-900">Payment Failed</h2>
                            <p className="text-gray-500">
                                We could not process your payment. Please try again or use a different method.
                            </p>
                            <div className="mt-6 space-y-3">
                                <button
                                    onClick={() => router.back()}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Try Again
                                </button>
                                <Link href="/buyer/dashboard" className="block text-sm text-indigo-600 hover:text-indigo-500">
                                    Return to Dashboard
                                </Link>
                            </div>
                        </div>
                    )}

                    {status === 'cancelled' && (
                        <div className="space-y-6">
                            <FaExclamationTriangle className="mx-auto h-16 w-16 text-yellow-500" />
                            <h2 className="text-2xl font-bold text-gray-900">Payment Cancelled</h2>
                            <p className="text-gray-500">
                                You cancelled the payment process. No charges were made.
                            </p>
                            <div className="mt-6">
                                <Link href="/buyer/dashboard" className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                                    Return to Dashboard
                                </Link>
                            </div>
                        </div>
                    )}

                    {!status && (
                        <div className="space-y-6">
                            <p className="text-gray-500">Checking payment status...</p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
