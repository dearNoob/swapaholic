'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { FaExclamationTriangle, FaPaperclip, FaTimes } from 'react-icons/fa';
import { disputeApi, CreateDisputeData } from '../../api/disputes';
import { Button } from '../../components/ui/Button';

const disputeSchema = yup.object({
    orderId: yup.string().required('Order ID is required'),
    reason: yup.string().required('Please select a reason'),
    description: yup.string().min(20, 'Please provide at least 20 characters').max(1000).required('Description is required'),
}).required();

type DisputeFormData = yup.InferType<typeof disputeSchema>;

interface FileDisputeProps {
    orderId?: string;
}

export const FileDispute: React.FC<FileDisputeProps> = ({ orderId: initialOrderId }) => {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);

    const { register, handleSubmit, formState: { errors } } = useForm<DisputeFormData>({
        resolver: yupResolver(disputeSchema),
        defaultValues: {
            orderId: initialOrderId || '',
            reason: '',
            description: '',
        },
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            setEvidenceFiles((prev) => [...prev, ...newFiles]);
        }
    };

    const removeFile = (index: number) => {
        setEvidenceFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const onSubmit = async (data: DisputeFormData) => {
        setIsSubmitting(true);
        try {
            const disputeData: CreateDisputeData = {
                orderId: data.orderId,
                reason: data.reason,
                description: data.description,
                evidence: evidenceFiles.length > 0 ? evidenceFiles : undefined,
            };

            const result = await disputeApi.create(disputeData);
            toast.success('Dispute filed successfully!');
            router.push(`/disputes/${result.id}`);
        } catch (error: any) {
            console.error('Error filing dispute:', error);
            toast.error(error.response?.data?.message || 'Failed to file dispute');
        } finally {
            setIsSubmitting(false);
        }
    };

    const reasons = [
        'Item not as described',
        'Item not received',
        'Item damaged/defective',
        'Seller unresponsive',
        'Wrong item received',
        'Quality issues',
        'Other',
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded">
                    <div className="flex items-center">
                        <FaExclamationTriangle className="text-yellow-400 text-2xl mr-3" />
                        <div>
                            <h3 className="text-lg font-semibold text-yellow-800">File a Dispute</h3>
                            <p className="text-sm text-yellow-700 mt-1">
                                Please provide detailed information about your issue. Our team will review and respond within 24-48 hours.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Order ID */}
                        <div>
                            <label htmlFor="orderId" className="block text-sm font-medium text-gray-700 mb-2">
                                Order ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="orderId"
                                {...register('orderId')}
                                placeholder="Enter the order ID for this dispute"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                            {errors.orderId && (
                                <p className="mt-1 text-sm text-red-600">{errors.orderId.message}</p>
                            )}
                        </div>

                        {/* Reason */}
                        <div>
                            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
                                Reason for Dispute <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="reason"
                                {...register('reason')}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="">Select a reason</option>
                                {reasons.map((reason) => (
                                    <option key={reason} value={reason}>
                                        {reason}
                                    </option>
                                ))}
                            </select>
                            {errors.reason && (
                                <p className="mt-1 text-sm text-red-600">{errors.reason.message}</p>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="description"
                                {...register('description')}
                                rows={6}
                                placeholder="Provide a detailed description of your issue..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                            />
                            {errors.description && (
                                <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500">Minimum 20 characters, maximum 1000 characters</p>
                        </div>

                        {/* Evidence Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Evidence (Optional)
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                <FaPaperclip className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-600 mb-2">
                                    Upload images or documents to support your claim
                                </p>
                                <label className="cursor-pointer inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">
                                    Choose Files
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*,.pdf,.doc,.docx"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>

                            {/* File List */}
                            {evidenceFiles.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {evidenceFiles.map((file, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <FaPaperclip className="text-gray-400" />
                                                <span className="text-sm text-gray-700">{file.name}</span>
                                                <span className="text-xs text-gray-500">
                                                    ({(file.size / 1024).toFixed(1)} KB)
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeFile(index)}
                                                className="text-red-600 hover:text-red-800"
                                            >
                                                <FaTimes />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Submit */}
                        <div className="flex gap-4">
                            <Button
                                type="submit"
                                isLoading={isSubmitting}
                                disabled={isSubmitting}
                                className="flex-1"
                            >
                                Submit Dispute
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
