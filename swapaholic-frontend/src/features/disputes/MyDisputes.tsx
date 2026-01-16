'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { FaExclamationTriangle, FaEye, FaClock, FaCheckCircle, FaBan, FaPlus } from 'react-icons/fa';
import { disputeApi, Dispute } from '../../api/disputes';
import { Button } from '../../components/ui/Button';

export const MyDisputes = () => {
    const [disputes, setDisputes] = useState<Dispute[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');

    useEffect(() => {
        fetchDisputes();
    }, []);

    const fetchDisputes = async () => {
        try {
            setIsLoading(true);
            const data = await disputeApi.getUserDisputes();
            const disputesList = Array.isArray(data) ? data : (data.disputes || []);
            setDisputes(disputesList);
        } catch (error) {
            console.error('Error fetching disputes:', error);
            // Mock data
            setDisputes([
                {
                    id: '1',
                    orderId: 'ORD-123456',
                    raisedBy: 'buyer',
                    raisedByUserId: 'me',
                    raisedByName: 'You',
                    againstUserId: 'seller-1',
                    againstName: 'John Seller',
                    reason: 'Item not as described',
                    description: 'The product received does not match the description...',
                    status: 'under_review',
                    evidence: [],
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    updatedAt: new Date().toISOString(),
                },
                {
                    id: '2',
                    orderId: 'ORD-789012',
                    raisedBy: 'buyer',
                    raisedByUserId: 'me',
                    raisedByName: 'You',
                    againstUserId: 'seller-2',
                    againstName: 'Jane Merchant',
                    reason: 'Item damaged',
                    description: 'The item arrived with visible damage...',
                    status: 'resolved',
                    evidence: [],
                    resolution: {
                        resolvedBy: 'Admin',
                        decision: 'Refund issued to buyer',
                        notes: 'Seller agreed to full refund',
                        resolvedAt: new Date(Date.now() - 3600000).toISOString(),
                    },
                    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
                    updatedAt: new Date(Date.now() - 3600000).toISOString(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'open':
                return <FaExclamationTriangle className="text-yellow-500" />;
            case 'under_review':
                return <FaClock className="text-blue-500" />;
            case 'resolved':
                return <FaCheckCircle className="text-green-500" />;
            case 'rejected':
                return <FaBan className="text-red-500" />;
            default:
                return <FaClock className="text-gray-400" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            open: 'bg-yellow-100 text-yellow-800',
            under_review: 'bg-blue-100 text-blue-800',
            resolved: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800',
        };
        return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
    };

    const filteredDisputes = disputes.filter((dispute) => {
        if (filter === 'all') return true;
        return dispute.status === filter;
    });

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">My Disputes</h1>
                        <p className="mt-2 text-gray-600">Track and manage your order disputes</p>
                    </div>
                    <Link href="/disputes/file">
                        <Button className="flex items-center gap-2">
                            <FaPlus /> File New Dispute
                        </Button>
                    </Link>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-sm text-gray-600">Total Disputes</p>
                        <p className="text-2xl font-bold text-gray-900 mt-2">{disputes.length}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-sm text-gray-600">Under Review</p>
                        <p className="text-2xl font-bold text-blue-600 mt-2">
                            {disputes.filter(d => d.status === 'under_review').length}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-sm text-gray-600">Resolved</p>
                        <p className="text-2xl font-bold text-green-600 mt-2">
                            {disputes.filter(d => d.status === 'resolved').length}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-sm text-gray-600">Open</p>
                        <p className="text-2xl font-bold text-yellow-600 mt-2">
                            {disputes.filter(d => d.status === 'open').length}
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow mb-6 p-4">
                    <div className="flex gap-2 flex-wrap">
                        {['all', 'open', 'under_review', 'resolved', 'rejected'].map((status) => (
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
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                        <p className="mt-4 text-gray-500">Loading disputes...</p>
                    </div>
                ) : filteredDisputes.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <FaExclamationTriangle className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No disputes found</h3>
                        <p className="text-gray-500 mb-6">
                            {filter === 'all'
                                ? "You haven't filed any disputes yet"
                                : `No ${filter.replace('_', ' ')} disputes`}
                        </p>
                        {filter === 'all' && (
                            <Link href="/disputes/file">
                                <Button>File a Dispute</Button>
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredDisputes.map((dispute) => (
                            <div
                                key={dispute.id}
                                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div>{getStatusIcon(dispute.status)}</div>
                                            <h3 className="text-lg font-semibold text-gray-900">
                                                {dispute.reason}
                                            </h3>
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(dispute.status)}`}
                                            >
                                                {dispute.status.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </div>

                                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                            {dispute.description}
                                        </p>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-500">Order ID:</span>
                                                <p className="font-medium text-gray-900">{dispute.orderId}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Against:</span>
                                                <p className="font-medium text-gray-900">{dispute.againstName}</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Created:</span>
                                                <p className="font-medium text-gray-900">
                                                    {new Date(dispute.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="text-gray-500">Evidence:</span>
                                                <p className="font-medium text-gray-900">
                                                    {dispute.evidence.length} file(s)
                                                </p>
                                            </div>
                                        </div>

                                        {dispute.resolution && (
                                            <div className="mt-4 p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                                                <p className="text-sm font-semibold text-green-900 mb-1">
                                                    Resolution:
                                                </p>
                                                <p className="text-sm text-gray-700">{dispute.resolution.decision}</p>
                                                {dispute.resolution.notes && (
                                                    <p className="text-xs text-gray-600 mt-2">
                                                        Note: {dispute.resolution.notes}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <Link href={`/disputes/${dispute.id}`}>
                                        <Button variant="outline" size="sm" className="ml-4">
                                            <FaEye className="mr-2" /> View
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
