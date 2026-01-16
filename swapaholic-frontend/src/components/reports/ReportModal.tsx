'use client';

import { useState } from 'react';
import { FaTimes, FaFlag } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { reportsApi } from '../../api/reports';

interface ReportModalProps {
    type: 'product' | 'user' | 'review' | 'content';
    targetId: string;
    targetName: string;
    onClose: () => void;
}

export default function ReportModal({ type, targetId, targetName, onClose }: ReportModalProps) {
    const [reason, setReason] = useState('');
    const [details, setDetails] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const reasons = {
        product: [
            'Fraudulent listing',
            'Counterfeit item',
            'Prohibited item',
            'Misleading description',
            'Inappropriate images',
            'Price manipulation',
            'Other',
        ],
        user: [
            'Harassment',
            'Scam/Fraud',
            'Spam',
            'Fake account',
            'Inappropriate behavior',
            'Other',
        ],
        review: [
            'Fake review',
            'Offensive language',
            'Spam',
            'Irrelevant content',
            'Personal information',
            'Other',
        ],
        content: [
            'Inappropriate content',
            'Spam',
            'Copyright violation',
            'Offensive material',
            'Other',
        ],
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!reason || !details.trim()) {
            toast.error('Please select a reason and provide details');
            return;
        }

        setIsSubmitting(true);
        try {
            switch (type) {
                case 'product':
                    await reportsApi.reportProduct(targetId, reason, details);
                    break;
                case 'user':
                    await reportsApi.reportUser(targetId, reason, details);
                    break;
                case 'review':
                    await reportsApi.reportReview(targetId, reason, details);
                    break;
                case 'content':
                    await reportsApi.flagContent(type, targetId, reason, details);
                    break;
            }
            toast.success('Report submitted successfully. We will review it shortly.');
            onClose();
        } catch (err) {
            toast.error('Failed to submit report');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <FaFlag className="text-red-600 text-xl" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Report {type}</h2>
                            <p className="text-sm text-gray-600">{targetName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 p-2"
                    >
                        <FaTimes className="text-xl" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6">
                    {/* Reason Selection */}
                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Reason for reporting *
                        </label>
                        <select
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                            required
                        >
                            <option value="">Select a reason...</option>
                            {reasons[type].map((r) => (
                                <option key={r} value={r}>
                                    {r}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Details */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Additional details *
                        </label>
                        <textarea
                            value={details}
                            onChange={(e) => setDetails(e.target.value)}
                            placeholder="Please provide specific details about this report..."
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 resize-none"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Be specific to help our team review this report
                        </p>
                    </div>

                    {/* Info Box */}
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800">
                            <strong>Note:</strong> False reports may result in account suspension.
                            We take all reports seriously and will review them promptly.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Report'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
