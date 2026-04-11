'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FaTruck, FaClipboardCheck, FaCheckCircle, FaTimesCircle, FaArrowLeft, FaEnvelope, FaPhone, FaCalendarAlt, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { adminApi } from '../../../../api/admin';
import { useRequireAdminAuth } from '../../../../hooks/useRequireAdminAuth';

interface OfficerProfile {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    createdAt: string;
    accountStatus: string;
    bio?: string;
}

interface OfficerStats {
    qc: {
        total: number;
        approved: number;
        rejected: number;
    };
    delivery: {
        total: number;
    };
}

interface HistoryOrderRef {
    _id?: string;
}

interface QcHistoryEntry {
    _id: string;
    status: string;
    qualityValidation?: number;
    rejectionReason?: string;
    reviewedAt?: string;
    orderId?: HistoryOrderRef;
}

interface DeliveryHistoryEntry {
    _id: string;
    status: string;
    pickupTime?: string;
    deliveryTime?: string;
    orderId?: HistoryOrderRef;
}

interface LogisticsOfficerDetailData {
    officer: OfficerProfile;
    stats: OfficerStats;
    qcHistory: QcHistoryEntry[];
    deliveryHistory: DeliveryHistoryEntry[];
}

export default function LogisticsOfficerDetailPage() {
    const { isLoading: isAuthLoading } = useRequireAdminAuth();
    const { userId } = useParams<{ userId: string }>();
    const router = useRouter();

    const [data, setData] = useState<LogisticsOfficerDetailData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'qc' | 'delivery'>('qc');

    useEffect(() => {
        if (!userId) {
            return;
        }

        (async () => {
            try {
                setIsLoading(true);
                const response = await adminApi.getLogisticsOfficerDetail(userId);
                setData(response as LogisticsOfficerDetailData);
            } catch (error) {
                console.error('Failed to load officer details:', error);
                toast.error('Failed to load officer details');
            } finally {
                setIsLoading(false);
            }
        })();
    }, [userId]);

    if (isAuthLoading || isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <FaSpinner className="text-4xl text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-xl text-gray-500">Officer not found.</p>
                    <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl">
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    const { officer, stats, qcHistory, deliveryHistory } = data;

    const getQcStatusColor = (status: string) => {
        const map: Record<string, string> = {
            approved: 'bg-emerald-100 text-emerald-700',
            rejected: 'bg-red-100 text-red-700',
            in_review: 'bg-blue-100 text-blue-700',
            pending: 'bg-amber-100 text-amber-700',
        };

        return map[status] || 'bg-gray-100 text-gray-600';
    };

    const getDeliveryStatusColor = (status: string) => {
        const map: Record<string, string> = {
            delivered: 'bg-emerald-100 text-emerald-700',
            failed: 'bg-red-100 text-red-700',
            in_transit: 'bg-indigo-100 text-indigo-700',
            picked_up: 'bg-blue-100 text-blue-700',
            assigned: 'bg-cyan-100 text-cyan-700',
        };

        return map[status] || 'bg-gray-100 text-gray-600';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 transition-colors"
                >
                    <FaArrowLeft /> Back to Officers List
                </button>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
                            <FaTruck className="text-white text-3xl" />
                        </div>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold text-gray-900">
                                {officer.firstName} {officer.lastName}
                            </h1>
                            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1"><FaEnvelope className="text-xs" />{officer.email}</span>
                                {officer.phone && <span className="flex items-center gap-1"><FaPhone className="text-xs" />{officer.phone}</span>}
                                <span className="flex items-center gap-1">
                                    <FaCalendarAlt className="text-xs" />
                                    Joined {new Date(officer.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            {officer.bio && <p className="text-gray-600 mt-2 text-sm">{officer.bio}</p>}
                        </div>
                        <div>
                            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
                                officer.accountStatus === 'active'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : officer.accountStatus === 'pending_approval'
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-red-100 text-red-700'
                            }`}>
                                {officer.accountStatus?.replace('_', ' ')}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {[
                        { label: 'QC Total', value: stats.qc.total, icon: FaClipboardCheck, color: 'text-teal-600', bg: 'bg-teal-50' },
                        { label: 'QC Approved', value: stats.qc.approved, icon: FaCheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'QC Rejected', value: stats.qc.rejected, icon: FaTimesCircle, color: 'text-red-600', bg: 'bg-red-50' },
                        { label: 'Deliveries', value: stats.delivery.total, icon: FaTruck, color: 'text-blue-600', bg: 'bg-blue-50' },
                    ].map((card) => (
                        <div key={card.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
                            <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center mb-3`}>
                                <card.icon className={`${card.color} text-lg`} />
                            </div>
                            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="flex border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab('qc')}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all ${activeTab === 'qc' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            <FaClipboardCheck /> QC History ({qcHistory?.length || 0})
                        </button>
                        <button
                            onClick={() => setActiveTab('delivery')}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-all ${activeTab === 'delivery' ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                        >
                            <FaTruck /> Delivery History ({deliveryHistory?.length || 0})
                        </button>
                    </div>

                    {activeTab === 'qc' && (
                        <div className="overflow-x-auto">
                            {!qcHistory?.length ? (
                                <div className="p-10 text-center text-gray-400">
                                    <FaClipboardCheck className="text-4xl mx-auto mb-3 text-gray-300" />
                                    No QC history yet
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Order</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Quality Score</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Rejection Reason</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Reviewed At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {qcHistory.map((qc) => (
                                            <tr key={qc._id} className="hover:bg-gray-50 transition-colors">
                                                <td className="py-3 px-4 text-sm text-gray-700">
                                                    #{String(qc.orderId?._id || qc._id).slice(-6)}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getQcStatusColor(qc.status)}`}>
                                                        {qc.status?.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-600">
                                                    {qc.qualityValidation ? `${qc.qualityValidation}%` : '-'}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-500 max-w-xs truncate">
                                                    {qc.rejectionReason || '-'}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-500">
                                                    {qc.reviewedAt ? new Date(qc.reviewedAt).toLocaleDateString() : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}

                    {activeTab === 'delivery' && (
                        <div className="overflow-x-auto">
                            {!deliveryHistory?.length ? (
                                <div className="p-10 text-center text-gray-400">
                                    <FaTruck className="text-4xl mx-auto mb-3 text-gray-300" />
                                    No delivery history yet
                                </div>
                            ) : (
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Order</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Pickup</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Delivered At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {deliveryHistory.map((delivery) => (
                                            <tr key={delivery._id} className="hover:bg-gray-50 transition-colors">
                                                <td className="py-3 px-4 text-sm text-gray-700">
                                                    #{String(delivery.orderId?._id || delivery._id).slice(-6)}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDeliveryStatusColor(delivery.status)}`}>
                                                        {delivery.status?.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-500">
                                                    {delivery.pickupTime ? new Date(delivery.pickupTime).toLocaleDateString() : '-'}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-500">
                                                    {delivery.deliveryTime ? new Date(delivery.deliveryTime).toLocaleDateString() : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
