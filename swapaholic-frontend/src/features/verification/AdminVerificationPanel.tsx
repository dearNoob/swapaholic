'use client';

import React, { useEffect, useState } from 'react';
import { verificationApi, Verification } from '../../api/verification';
import { toast } from 'react-toastify';
import { FaCheck, FaTimes, FaUserShield } from 'react-icons/fa';
import { Button } from '../../components/ui/Button';

export const AdminVerificationPanel = () => {
    const [pending, setPending] = useState<Verification[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchPending = async () => {
        try {
            setLoading(true);
            const data = await verificationApi.getPendingVerifications();
            const list = Array.isArray(data) ? data : (data.verifications || []);
            setPending(list);
        } catch (err) {
            console.error(err);
            toast.error('Failed to load pending verifications');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleApprove = async (id: string) => {
        try {
            await verificationApi.approveVerification(id);
            toast.success('Verification approved');
            fetchPending();
        } catch (err) {
            console.error(err);
            toast.error('Approve failed');
        }
    };

    const handleReject = async (id: string) => {
        const reason = prompt('Reason for rejection (optional)') || undefined;
        try {
            await verificationApi.rejectVerification(id, reason);
            toast.success('Verification rejected');
            fetchPending();
        } catch (err) {
            console.error(err);
            toast.error('Reject failed');
        }
    };

    if (loading) {
        return <p className="text-gray-600">Loading pending verifications...</p>;
    }

    if (pending.length === 0) {
        return <p className="text-gray-600">No pending verifications.</p>;
    }

    return (
        <div className="space-y-4">
            {pending.map((v) => (
                <div key={v.id} className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FaUserShield className="text-indigo-500" />
                        <div>
                            <p className="font-medium text-gray-900">{v.fullName || 'User'}</p>
                            <p className="text-sm text-gray-600">{v.email || ''}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleApprove(v.id)}>
                            <FaCheck className="mr-1" /> Approve
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleReject(v.id)}>
                            <FaTimes className="mr-1" /> Reject
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
};
