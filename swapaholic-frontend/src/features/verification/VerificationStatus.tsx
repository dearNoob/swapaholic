'use client';

import { useEffect, useState } from 'react';
import { verificationApi } from '../../api/verification';
import { FaCheckCircle, FaTimesCircle, FaHourglassHalf } from 'react-icons/fa';
import { Button } from '../../components/ui/Button';
import Link from 'next/link';

interface VerificationStatusResponse {
    status: 'loading' | 'pending' | 'approved' | 'verified' | 'rejected' | 'error';
    message?: string;
}

export const VerificationStatus = () => {
    const [status, setStatus] = useState<string>('loading');
    const [details, setDetails] = useState<VerificationStatusResponse | null>(null);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const data = await verificationApi.getUserStatus() as VerificationStatusResponse;
                setStatus(data.status);
                setDetails(data);
            } catch (err) {
                console.error(err);
                setStatus('error');
            }
        };
        fetchStatus();
    }, []);

    const renderIcon = () => {
        switch (status) {
            case 'verified':
                return <FaCheckCircle className="text-green-500 text-4xl" />;
            case 'rejected':
                return <FaTimesCircle className="text-red-500 text-4xl" />;
            case 'pending':
                return <FaHourglassHalf className="text-yellow-500 text-4xl" />;
            default:
                return null;
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
                {renderIcon()} Verification Status
            </h2>
            {status === 'loading' && <p className="text-gray-600">Loading...</p>}
            {status === 'error' && <p className="text-red-600">Failed to load status.</p>}
            {status !== 'loading' && status !== 'error' && (
                <div className="space-y-4">
                    <p className="text-lg text-gray-800">Your current status: <span className="font-semibold capitalize">{status}</span></p>
                    {details?.message && <p className="text-sm text-gray-600">{details.message}</p>}
                    {status !== 'verified' && (
                        <Link href="/verification/form">
                            <Button className="mt-4">Complete Verification</Button>
                        </Link>
                    )}
                </div>
            )}
        </div>
    );
};
