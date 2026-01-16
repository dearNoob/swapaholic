'use client';

import { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { adminApi } from '../../../api/admin';

export default function DisputeResolutionPage() {
    const [disputes, setDisputes] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchDisputes();
    }, [filter]);

    const fetchDisputes = async () => {
        try {
            setIsLoading(true);
            const data = await adminApi.getAllDisputes({ status: filter !== 'all' ? filter : undefined });
            setDisputes(data.disputes || []);
        } catch (err) {
            console.error('Error fetching disputes:', err);
            // Mock data
            setDisputes(Array.from({ length: 12 }, (_, i) => ({
                id: `dispute-${i + 1}`,
                orderId: `order-${i + 1}`,
                productTitle: `Product ${i + 1}`,
                buyer: `Buyer ${i + 1}`,
                seller: `Seller ${i + 1}`,
                reason: ['Item not as described', 'Item not received', 'Damaged item', 'Wrong item'][Math.floor(Math.random() * 4)],
                description: 'Dispute description goes here...',
                status: ['open', 'under_review', 'resolved'][Math.floor(Math.random() * 3)],
                createdAt: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
            })));
        } finally {
            setIsLoading(false);
        }
    };

    const handleResolve = async (disputeId: string) => {
        const decision = prompt('Decision (buyer/seller):');
        const notes = prompt('Resolution notes:');

        if (decision && notes) {
            try {
                await adminApi.resolveDispute(disputeId, decision, notes);
                toast.success('Dispute resolved');
                fetchDisputes();
            } catch (err) {
                toast.error('Failed to resolve dispute');
            }
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                        Dispute Resolution ⚖️
                    </h1>
                    <p className="text-lg text-gray-600">
                        Handle user disputes and conflicts
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="flex gap-2">
                        {['all', 'open', 'under_review', 'resolved'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilter(status)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === status
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {status.replace('_', ' ').toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Disputes List */}
                {isLoading ? (
                    <div className="text-center py-16">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
                        <p className="text-gray-600">Loading disputes...</p>
                    </div>
                ) : disputes.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <FaCheckCircle className="mx-auto text-6xl text-green-500 mb-4" />
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">No Disputes!</h3>
                        <p className="text-gray-600">All disputes have been resolved</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {disputes.map((dispute) => (
                            <div
                                key={dispute.id}
                                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
                            >
                                <div className="flex items-start gap-4">
                                    {/* Status Icon */}
                                    <div className={`p-3 rounded-full ${dispute.status === 'resolved' ? 'bg-green-100' :
                                            dispute.status === 'under_review' ? 'bg-yellow-100' :
                                                'bg-red-100'
                                        }`}>
                                        {dispute.status === 'resolved' ? (
                                            <FaCheckCircle className="text-2xl text-green-600" />
                                        ) : dispute.status === 'under_review' ? (
                                            <FaExclamationTriangle className="text-2xl text-yellow-600" />
                                        ) : (
                                            <FaTimesCircle className="text-2xl text-red-600" />
                                        )}
                                    </div>

                                    {/* Dispute Info */}
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between mb-3">
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900 mb-1">
                                                    {dispute.productTitle}
                                                </h3>
                                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                                    <span>Order: {dispute.orderId}</span>
                                                    <span>Buyer: <strong>{dispute.buyer}</strong></span>
                                                    <span>Seller: <strong>{dispute.seller}</strong></span>
                                                    <span>{new Date(dispute.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${dispute.status === 'resolved' ? 'bg-green-100 text-green-800' :
                                                    dispute.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                }`}>
                                                {dispute.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </div>

                                        <div className="mb-4">
                                            <p className="text-sm font-semibold text-gray-700 mb-1">
                                                Reason: {dispute.reason}
                                            </p>
                                            <p className="text-sm text-gray-600">
                                                {dispute.description}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        {dispute.status !== 'resolved' && (
                                            <button
                                                onClick={() => handleResolve(dispute.id)}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                                            >
                                                Resolve Dispute
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
