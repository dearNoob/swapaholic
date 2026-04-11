'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    FaExclamationTriangle, FaCheckCircle, FaTimesCircle,
    FaBalanceScale, FaUserTie, FaClock, FaClipboardList, FaGavel,
    FaArrowLeft, FaSyncAlt, FaFileAlt, FaChevronLeft, FaChevronRight,
    FaComments, FaUserEdit, FaMoneyBillWave, FaHandshake, FaUndo
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { adminApi } from '../../../api/admin';
import { useRequireAdminAuth } from '../../../hooks/useRequireAdminAuth';
import '../../../styles/admin-dashboard.css';

// Admin-specific Dispute (Order) Interface
interface AdminDispute {
    _id: string;
    finalPrice: number;
    status: string;
    escrowStatus: string;
    disputeReason?: string;
    disputeDescription?: string;
    disputeFiledBy?: string;
    disputeFiledAt?: string;
    disputeAssignedTo?: string; // Admin ID
    notes?: string;
    createdAt: string;
    updatedAt: string;
    buyerId: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    sellerId: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    productId: {
        _id: string;
        title: string;
        category: string;
    };
}

interface DisputeStats {
    totalDisputes: number;
    openDisputes: number;
    assignedDisputes: number;
    averageResolutionTimeHours: number;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === 'object' && 'response' in error) {
        const response = error.response as { data?: { message?: string } };
        if (response?.data?.message) {
            return response.data.message;
        }
    }

    return fallback;
};

export default function AdminDisputesPage() {
    const { isLoading: isAuthLoading, isAdmin, user } = useRequireAdminAuth();
    const [disputes, setDisputes] = useState<AdminDispute[]>([]);
    const [stats, setStats] = useState<DisputeStats | null>(null);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, pages: 0 });

    const [statusFilter, setStatusFilter] = useState('disputed');
    
    // Selected dispute and modal state
    const [selectedDispute, setSelectedDispute] = useState<AdminDispute | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [adminNotes, setAdminNotes] = useState('');
    const [resolutionAction, setResolutionAction] = useState<'seller' | 'buyer' | 'split' | null>(null);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [isActionLoading, setIsActionLoading] = useState(false);

    const isLoading = isAuthLoading || isDataLoading;

    const fetchDashboardData = useCallback(async (page = 1) => {
        try {
            setIsDataLoading(true);
            const [disputesRes, statsRes] = await Promise.allSettled([
                adminApi.getAllDisputes({ status: statusFilter === 'all' ? undefined : statusFilter, page, limit: pagination.limit }),
                adminApi.getDisputeStats()
            ]);

            if (disputesRes.status === 'fulfilled') {
                setDisputes(disputesRes.value.disputes || []);
                setPagination(disputesRes.value.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
            }

            if (statsRes.status === 'fulfilled') {
                setStats(statsRes.value);
            }
        } catch (err) {
            console.error('Error fetching dispute data:', err);
            toast.error('Failed to load disputes');
        } finally {
            setIsDataLoading(false);
        }
    }, [statusFilter, pagination.limit]);

    useEffect(() => {
        if (isAdmin) {
            void fetchDashboardData(1);
        }
    }, [isAdmin, fetchDashboardData]);

    const handleAssignDispute = async (orderId: string) => {
        if (!user?.id) return;
        try {
            await adminApi.assignDispute(orderId, user.id);
            toast.success('Dispute claimed successfully');
            void fetchDashboardData(pagination.page);
            if (selectedDispute && selectedDispute._id === orderId) {
                // Optimistically update the selected dispute in modal
                setSelectedDispute({ ...selectedDispute, disputeAssignedTo: user.id });
            }
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to claim dispute'));
        }
    };

    const handleAddNotes = async () => {
        if (!selectedDispute || !adminNotes.trim()) return;
        try {
            setIsActionLoading(true);
            const res = await adminApi.addInvestigationNotes(selectedDispute._id, adminNotes) as { order?: { notes?: string } };
            toast.success('Investigation note added');
            setAdminNotes('');
            // Update selected dispute's notes optimistically
            setSelectedDispute({ ...selectedDispute, notes: res.order?.notes });
            void fetchDashboardData(pagination.page);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to add notes'));
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleResolve = async () => {
        if (!selectedDispute || !resolutionAction) return;
        
        try {
            setIsActionLoading(true);
            if (resolutionAction === 'seller') {
                await adminApi.resolveDispute(selectedDispute._id, 'seller', resolutionNotes);
                toast.success('Dispute resolved: Payment released to seller');
            } else if (resolutionAction === 'buyer') {
                await adminApi.resolveDispute(selectedDispute._id, 'buyer', resolutionNotes);
                toast.success('Dispute resolved: Refund issued to buyer');
            } else if (resolutionAction === 'split') {
                await adminApi.resolveDispute(selectedDispute._id, 'split', resolutionNotes);
                toast.success('Dispute resolved: Payment split 50/50');
            }
            
            setIsModalOpen(false);
            setResolutionAction(null);
            setResolutionNotes('');
            void fetchDashboardData(pagination.page);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Failed to resolve dispute'));
        } finally {
            setIsActionLoading(false);
        }
    };

    const openDisputeModal = (dispute: AdminDispute) => {
        setSelectedDispute(dispute);
        setResolutionAction(null);
        setResolutionNotes('');
        setAdminNotes('');
        setIsModalOpen(true);
    };

    // Parse the notes string backward to show newest first
    const getParsedNotes = (notesStr?: string) => {
        if (!notesStr) return [];
        return notesStr.split(' | ').filter(n => n.trim() !== '').reverse();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/30">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/dashboard" className="p-2 hover:bg-white rounded-xl transition-all">
                            <FaArrowLeft className="text-gray-400" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                                <div className="p-2 bg-indigo-600 rounded-xl text-white">
                                    <FaBalanceScale className="text-xl" />
                                </div>
                                Conflict Resolution Center
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Investigate, mediate, and resolve marketplace disputes
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchDashboardData(pagination.page)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <FaSyncAlt className="text-xs" />
                        Refresh Data
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-2xl p-5 border border-red-100 shadow-sm relative overflow-hidden group hover:border-red-200 transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-red-600">
                                    <FaExclamationTriangle className="text-lg" />
                                </div>
                            </div>
                            <h3 className="text-gray-500 text-sm font-medium">Total Disputes</h3>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.totalDisputes || 0}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm relative overflow-hidden group hover:border-amber-200 transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                                    <FaClipboardList className="text-lg" />
                                </div>
                            </div>
                            <h3 className="text-gray-500 text-sm font-medium">Open / Unassigned</h3>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.openDisputes || 0}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                    <FaUserTie className="text-lg" />
                                </div>
                            </div>
                            <h3 className="text-gray-500 text-sm font-medium">Assigned (In Progress)</h3>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.assignedDisputes || 0}</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                        <div className="relative">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <FaClock className="text-lg" />
                                </div>
                            </div>
                            <h3 className="text-gray-500 text-sm font-medium">Avg Resolution Time</h3>
                            <p className="text-3xl font-bold text-gray-900 mt-1">{stats?.averageResolutionTimeHours || 0}<span className="text-lg text-gray-400 font-medium ml-1">hrs</span></p>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 mb-6 inline-flex">
                    {[
                        { key: 'all', label: 'All History' },
                        { key: 'disputed', label: 'Active Disputes' },
                        { key: 'completed', label: 'Resolved (Seller)' },
                        { key: 'cancelled', label: 'Refunded (Buyer)' },
                    ].map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setStatusFilter(f.key)}
                            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all ${
                                statusFilter === f.key
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Disputes List */}
                {isLoading ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">Loading cases...</p>
                    </div>
                ) : disputes.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
                        <FaCheckCircle className="text-5xl text-emerald-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-900 mb-1">Clear Queue</h3>
                        <p className="text-gray-500">There are no disputes matching this criteria.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-100">
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Case Info</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product & Value</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Parties Involved</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status & Assignment</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {disputes.map((dispute) => (
                                        <tr key={dispute._id} className="hover:bg-gray-50/50 transition-colors">
                                            {/* Case Info */}
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-xs text-gray-500 mb-1">ID: {dispute._id.slice(-8).toUpperCase()}</div>
                                                <div className="text-sm font-bold text-gray-900 mb-1 line-clamp-1">
                                                    {dispute.disputeReason || 'Unspecified Dispute'}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    Opened {new Date(dispute.updatedAt).toLocaleDateString()}
                                                </div>
                                            </td>

                                            {/* Product & Value */}
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 font-medium line-clamp-1 mb-1">
                                                    {dispute.productId?.title || 'Unknown Product'}
                                                </div>
                                                <div className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700">
                                                    ৳{dispute.finalPrice?.toLocaleString()}
                                                </div>
                                            </td>

                                            {/* Parties */}
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-xs flex justify-between gap-4">
                                                        <span className="text-gray-500">Buyer:</span>
                                                        <span className="font-medium text-gray-900">{dispute.buyerId?.firstName} {dispute.buyerId?.lastName}</span>
                                                    </div>
                                                    <div className="text-xs flex justify-between gap-4">
                                                        <span className="text-gray-500">Seller:</span>
                                                        <span className="font-medium text-gray-900">{dispute.sellerId?.firstName} {dispute.sellerId?.lastName}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Assignment & Status */}
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col items-start gap-2">
                                                    {dispute.status === 'disputed' ? (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 animate-pulse">
                                                            Active Dispute
                                                        </span>
                                                    ) : dispute.status === 'completed' ? (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                                            Resolved
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                                            {dispute.status.toUpperCase()}
                                                        </span>
                                                    )}
                                                    
                                                    {dispute.status === 'disputed' && (
                                                        dispute.disputeAssignedTo ? (
                                                            <div className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-100">
                                                                <FaUserTie />
                                                                <span className="font-medium">Assigned</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-200 border-dashed">
                                                                <span className="font-medium">Unassigned</span>
                                                            </div>
                                                        )
                                                    )}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => openDisputeModal(dispute)}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all shadow-sm"
                                                >
                                                    <FaFileAlt />
                                                    View Case
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.pages > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                                <p className="text-sm text-gray-500">
                                    Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} disputes
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => fetchDashboardData(pagination.page - 1)}
                                        disabled={pagination.page <= 1}
                                        className="p-2 rounded-lg hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <FaChevronLeft className="text-xs text-gray-600" />
                                    </button>
                                    <span className="text-sm font-medium text-gray-700 px-3">
                                        Page {pagination.page} of {pagination.pages}
                                    </span>
                                    <button
                                        onClick={() => fetchDashboardData(pagination.page + 1)}
                                        disabled={pagination.page >= pagination.pages}
                                        className="p-2 rounded-lg hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <FaChevronRight className="text-xs text-gray-600" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Comprehensive Dispute Resolution Modal */}
            {isModalOpen && selectedDispute && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
                    <div 
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="border-b border-gray-100 px-6 py-5 flex items-center justify-between bg-slate-50">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedDispute.status === 'disputed' ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
                                    <FaBalanceScale className="text-xl" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h2 className="text-xl font-bold text-gray-900">Case Investigation</h2>
                                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-gray-200 text-gray-700">
                                            #{selectedDispute._id.slice(-8).toUpperCase()}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-gray-500">
                                        {selectedDispute.disputeReason || 'Unspecified Reason'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {/* Claim/Assign Button */}
                                {selectedDispute.status === 'disputed' && !selectedDispute.disputeAssignedTo && (
                                    <button
                                        onClick={() => handleAssignDispute(selectedDispute._id)}
                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition shadow-sm flex items-center gap-2"
                                    >
                                        <FaUserEdit /> Claim Case
                                    </button>
                                )}
                                {selectedDispute.status === 'disputed' && selectedDispute.disputeAssignedTo === user?.id && (
                                    <span className="px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold rounded-xl flex items-center gap-2">
                                        <FaCheckCircle /> Assigned to You
                                    </span>
                                )}
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2.5 bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition border border-gray-200 shadow-sm"
                                >
                                    <FaTimesCircle className="text-xl" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Body - Scrollable Split Pane */}
                        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
                            
                            {/* Left Pane: Facts & Evidence */}
                            <div className="flex-1 space-y-6">
                                {/* Details Block */}
                                <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <FaClipboardList className="text-gray-400"/> Case Details
                                    </h3>
                                    
                                    <div className="space-y-4 text-sm">
                                        <div>
                                            <span className="block text-xs font-semibold text-gray-500 mb-1">Product</span>
                                            <span className="font-medium text-gray-900">{selectedDispute.productId?.title}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                                <span className="block text-xs font-semibold text-gray-500 mb-1">Disputed Value</span>
                                                <span className="text-lg font-bold text-red-600">৳{selectedDispute.finalPrice?.toLocaleString()}</span>
                                            </div>
                                            <div className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm">
                                                <span className="block text-xs font-semibold text-gray-500 mb-1">Escrow Status</span>
                                                <span className="font-semibold text-gray-700 uppercase">{selectedDispute.escrowStatus}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="mt-4 p-4 border border-red-100 bg-white rounded-lg">
                                            <span className="block text-xs font-bold text-red-500 mb-2 uppercase tracking-wide">Complainant Description</span>
                                            <p className="text-gray-700 whitespace-pre-wrap">
                                                {selectedDispute.disputeDescription || 'No detailed description provided by the user.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Parties Block */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                                        <h4 className="text-xs font-bold text-blue-800 uppercase mb-2">Buyer</h4>
                                        <p className="font-semibold text-gray-900">{selectedDispute.buyerId?.firstName} {selectedDispute.buyerId?.lastName}</p>
                                        <p className="text-xs text-gray-500">{selectedDispute.buyerId?.email}</p>
                                    </div>
                                    <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100">
                                        <h4 className="text-xs font-bold text-emerald-800 uppercase mb-2">Seller</h4>
                                        <p className="font-semibold text-gray-900">{selectedDispute.sellerId?.firstName} {selectedDispute.sellerId?.lastName}</p>
                                        <p className="text-xs text-gray-500">{selectedDispute.sellerId?.email}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Right Pane: Investigation & Resolution */}
                            <div className="flex-1 space-y-6 flex flex-col">
                                
                                {/* Timeline / Notes */}
                                <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm flex-1 flex flex-col">
                                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <FaComments className="text-gray-400"/> Investigation Log
                                    </h3>
                                    
                                    <div className="flex-1 max-h-[300px] overflow-y-auto pr-2 space-y-3 mb-4 custom-scrollbar">
                                        {getParsedNotes(selectedDispute.notes).length > 0 ? (
                                            getParsedNotes(selectedDispute.notes).map((note, idx) => (
                                                <div key={idx} className={`p-3 rounded-lg text-sm ${
                                                    note.includes('ADMIN RESOLUTION') ? 'bg-green-50 border-l-4 border-green-500 text-green-900 font-medium' :
                                                    note.includes('DISPUTE') ? 'bg-red-50 border-l-4 border-red-500 text-red-900' :
                                                    'bg-gray-50 border-l-4 border-gray-400 text-gray-700'
                                                }`}>
                                                    {note}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center text-gray-400 text-sm py-8 italic">No investigation history yet.</p>
                                        )}
                                    </div>

                                    {/* Add Note Form */}
                                    {selectedDispute.status === 'disputed' && selectedDispute.disputeAssignedTo === user?.id && (
                                        <div className="mt-auto border-t border-gray-100 pt-4">
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text"
                                                    value={adminNotes}
                                                    onChange={(e) => setAdminNotes(e.target.value)}
                                                    placeholder="Add internal investigation finding..."
                                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                                                    onKeyDown={(e) => e.key === 'Enter' && handleAddNotes()}
                                                    disabled={isActionLoading}
                                                />
                                                <button 
                                                    onClick={handleAddNotes}
                                                    disabled={isActionLoading || !adminNotes.trim()}
                                                    className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-900 disabled:opacity-50 transition"
                                                >
                                                    Add Note
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer - Resolution Controls */}
                        {selectedDispute.status === 'disputed' && selectedDispute.disputeAssignedTo === user?.id && (
                            <div className="border-t border-gray-200 bg-gray-50 p-6">
                                {!resolutionAction ? (
                                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                                        <div>
                                            <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                                <FaGavel className="text-indigo-600"/> Make Final Decision
                                            </h4>
                                            <p className="text-xs text-gray-500">This action will modify escrow funds and resolve the case.</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => setResolutionAction('buyer')}
                                                className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold rounded-lg text-sm flex items-center gap-2 transition"
                                            >
                                                <FaUndo /> Refund Buyer
                                            </button>
                                            <button 
                                                onClick={() => setResolutionAction('split')}
                                                className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-800 font-semibold rounded-lg text-sm flex items-center gap-2 transition"
                                            >
                                                <FaHandshake /> Split 50/50
                                            </button>
                                            <button 
                                                onClick={() => setResolutionAction('seller')}
                                                className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold rounded-lg text-sm flex items-center gap-2 transition"
                                            >
                                                <FaMoneyBillWave /> Pay Seller
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white p-5 rounded-xl border border-indigo-100 shadow-sm animate-fade-in">
                                        <div className="flex justify-between items-start mb-4">
                                            <h4 className="font-bold text-gray-900">
                                                Execute Resolution: 
                                                <span className={`ml-2 ${
                                                    resolutionAction === 'seller' ? 'text-emerald-600' : 
                                                    resolutionAction === 'buyer' ? 'text-blue-600' : 'text-purple-600'
                                                }`}>
                                                    {resolutionAction === 'seller' ? 'Release 100% to Seller' :
                                                     resolutionAction === 'buyer' ? 'Refund 100% to Buyer' :
                                                     'Compromise: Split Funds 50/50'}
                                                </span>
                                            </h4>
                                            <button onClick={() => setResolutionAction(null)} className="text-gray-400 hover:text-gray-700 text-sm font-medium">Cancel</button>
                                        </div>
                                        <textarea
                                            value={resolutionNotes}
                                            onChange={(e) => setResolutionNotes(e.target.value)}
                                            placeholder="Required: Provide final justification for this decision..."
                                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 min-h-[100px] mb-4"
                                        />
                                        <div className="flex justify-end">
                                            <button
                                                onClick={handleResolve}
                                                disabled={!resolutionNotes.trim() || isActionLoading}
                                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-sm transition flex items-center gap-2"
                                            >
                                                {isActionLoading && <FaSyncAlt className="animate-spin" />}
                                                Confirm & Resolve Case
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Display message if unassigned */}
                        {selectedDispute.status === 'disputed' && !selectedDispute.disputeAssignedTo && (
                             <div className="border-t border-amber-200 bg-amber-50 p-4 text-center">
                                 <p className="text-amber-800 font-medium text-sm">
                                     You must Claim this case before you can add notes or make a resolution decision.
                                 </p>
                             </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
