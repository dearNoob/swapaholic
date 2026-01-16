'use client';

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { verificationApi } from '../../api/verification';
import { DocumentUpload } from './DocumentUpload';
import { FaUserCheck, FaIdCard, FaSave } from 'react-icons/fa';
import { Button } from '../../components/ui/Button';

export const VerificationForm = () => {
    const [fullName, setFullName] = useState('');
    const [dob, setDob] = useState('');
    const [address, setAddress] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fullName || !dob || !address) {
            toast.error('Please fill all fields');
            return;
        }
        try {
            setIsSubmitting(true);
            await verificationApi.submitInfo({ fullName, dob, address });
            toast.success('Verification information submitted');
        } catch (err) {
            console.error(err);
            toast.error('Failed to submit verification info');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FaUserCheck /> Identity Verification
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="John Doe"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        rows={3}
                        placeholder="123 Main St, City, Country"
                    />
                </div>
                <DocumentUpload />
                <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2"
                >
                    <FaSave /> {isSubmitting ? 'Submitting...' : 'Submit Verification'}
                </Button>
            </form>
        </div>
    );
};
