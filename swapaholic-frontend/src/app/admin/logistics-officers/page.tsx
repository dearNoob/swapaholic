'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    FaTruck, FaCheckCircle, FaTimesCircle, FaClock,
    FaSearch, FaFilter, FaSyncAlt, FaArrowLeft
} from 'react-icons/fa';
import { adminApi } from '../../../api/admin';
import { toast } from 'react-toastify';
import { useRequireAdminAuth } from '../../../hooks/useRequireAdminAuth';
import Link from 'next/link';

export default function LogisticsOfficersPage() {
    const { isLoading: isAuthLoading, isAdmin } = useRequireAdminAuth();
    const [officers, setOfficers] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({ total: 0, pending: 0, active: 0 });
    const [pagination, setPagination] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [rejectModal, setRejectModal] = useState<{ show: boolean; userId: string; name: string }>({ show: false, userId: '', name: '' });
    const [rejectReason, setRejectReason] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchOfficers = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await adminApi.getLogisticsOfficers({
                status: statusFilter || undefined,
                search: searchQuery || undefined,
                limit: 20
            });
            setOfficers(data.officers || []);
            setStats(data.stats || { total: 0, pending: 0, active: 0 });
            setPagination(data.pagination);
        } catch (error) {
            console.error('Fetch officers error:', error);
            toast.error('Failed to load logistics officers');
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, searchQuery]);

    useEffect(() => {
        if (isAdmin) {
            fetchOfficers();
        }
    }, [isAdmin, fetchOfficers]);

    const handleApprove = async (userId: string) => {
        setIsProcessing(true);
        try {
            await adminApi.approveLogisticsOfficer(userId);
            toast.success('Logistics officer approved successfully!');
            fetchOfficers();
        } catch (error: any) {
            toast.error(error.message || 'Failed to approve officer');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            toast.error('Please provide a rejection reason');
            return;
        }
        setIsProcessing(true);
        try {
            await adminApi.rejectLogisticsOfficer(rejectModal.userId, rejectReason);
            toast.success('Logistics officer rejected');
            setRejectModal({ show: false, userId: '', name: '' });
            setRejectReason('');
            fetchOfficers();
        } catch (error: any) {
            toast.error(error.message || 'Failed to reject officer');
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pending_approval: 'bg-amber-100 text-amber-700 border-amber-200',
            active: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            banned: 'bg-red-100 text-red-700 border-red-200',
            suspended: 'bg-orange-100 text-orange-700 border-orange-200',
        };
        return styles[status] || 'bg-gray-100 text-gray-700 border-gray-200';
    };

    if (isAuthLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/30">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* Header */}
                <div className="mb-8">
                    <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors mb-4">
                        <FaArrowLeft className="text-xs" /> Back to Dashboard
                    </Link>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl text-white shadow-lg">
                                    <FaTruck className="text-xl" />
                                </div>
                                Logistics Officers
                            </h1>
                            <p className="text-gray-500 mt-1">Manage logistics officer accounts and approvals</p>
                        </div>
                        <button
                            onClick={fetchOfficers}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                        >
                            <FaSyncAlt className="text-xs" /> Refresh
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Total Officers</p>
                                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                                <FaTruck className="text-white text-lg" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-amber-100 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Pending Approval</p>
                                <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                                <FaClock className="text-white text-lg" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-emerald-100 p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500">Active Officers</p>
                                <p className="text-3xl font-bold text-emerald-600">{stats.active}</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center">
                                <FaCheckCircle className="text-white text-lg" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-3 mb-6">
                    <div className="relative flex-1">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>
                    <div className="relative">
                        <FaFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer min-w-[180px]"
                        >
                            <option value="">All Statuses</option>
                            <option value="pending_approval">Pending Approval</option>
                            <option value="active">Active</option>
                            <option value="banned">Rejected/Banned</option>
                            <option value="suspended">Suspended</option>
                        </select>
                    </div>
                </div>

                {/* Officers Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {isLoading ? (
                        <div className="p-12 text-center">
                            <div className="w-10 h-10 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-gray-500">Loading officers...</p>
                        </div>
                    ) : officers.length === 0 ? (
                        <div className="p-12 text-center">
                            <FaTruck className="text-5xl text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-2">No logistics officers found</h3>
                            <p className="text-gray-500">Try adjusting your filters or wait for new registrations.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50/50">
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Officer</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Registered</th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {officers.map((officer: any) => (
                                        <tr key={officer._id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                                                        {officer.firstName?.[0]}{officer.lastName?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-gray-900 text-sm">{officer.firstName} {officer.lastName}</p>
                                                        <p className="text-xs text-gray-500">ID: {String(officer._id).slice(-8)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <p className="text-sm text-gray-700">{officer.email}</p>
                                                <p className="text-xs text-gray-500">{officer.phone}</p>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadge(officer.accountStatus)}`}>
                                                    {officer.accountStatus === 'pending_approval' ? 'Pending' : officer.accountStatus}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-gray-500">
                                                {new Date(officer.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {officer.accountStatus === 'pending_approval' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprove(officer._id)}
                                                                disabled={isProcessing}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-all disabled:opacity-50"
                                                            >
                                                                <FaCheckCircle className="text-[10px]" /> Approve
                                                            </button>
                                                            <button
                                                                onClick={() => setRejectModal({ show: true, userId: officer._id, name: `${officer.firstName} ${officer.lastName}` })}
                                                                disabled={isProcessing}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium hover:bg-red-100 transition-all disabled:opacity-50"
                                                            >
                                                                <FaTimesCircle className="text-[10px]" /> Reject
                                                            </button>
                                                        </>
                                                    )}
                                                    {officer.accountStatus === 'active' && (
                                                        <span className="text-xs text-emerald-600 font-medium">✓ Approved</span>
                                                    )}
                                                    {officer.accountStatus === 'banned' && (
                                                        <span className="text-xs text-red-600 font-medium">Rejected</span>
                                                    )}
                                                    <Link
                                                        href={`/admin/logistics-officers/${officer._id}`}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs font-medium hover:bg-gray-100 transition-all"
                                                    >
                                                        View Details →
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Reject Modal */}
                {rejectModal.show && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
                            <h3 className="text-lg font-bold text-gray-900 mb-2">Reject Logistics Officer</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Are you sure you want to reject <strong>{rejectModal.name}</strong>?
                            </p>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Provide reason for rejection..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-4 resize-none"
                            />
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => { setRejectModal({ show: false, userId: '', name: '' }); setRejectReason(''); }}
                                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReject}
                                    disabled={isProcessing || !rejectReason.trim()}
                                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
                                >
                                    {isProcessing ? 'Rejecting...' : 'Reject Officer'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
