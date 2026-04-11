'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { paymentsApi, PendingPayout } from '../../../api/payments';
import { useRequireAdminAuth } from '../../../hooks/useRequireAdminAuth';
import { resolvePublicAssetUrl } from '../../../lib/publicUrls';

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
        return error.message;
    }

    return fallback;
};

export default function AdminPayoutsPage() {
    const { isLoading: isAuthLoading, isAdmin } = useRequireAdminAuth();
    const [payouts, setPayouts] = useState<PendingPayout[]>([]);
    const [loading, setLoading] = useState(true);
    const [releasing, setReleasing] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'eligible' | 'waiting'>('all');

    const fetchPayouts = useCallback(async () => {
        try {
            setLoading(true);
            const data = await paymentsApi.getPendingPayouts();
            setPayouts(data);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to load pending payouts'));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAdmin) fetchPayouts();
    }, [isAdmin, fetchPayouts]);

    const handleRelease = async (orderId: string) => {
        if (!confirm('Are you sure you want to release this payment to the seller?')) return;

        try {
            setReleasing(orderId);
            const result = await paymentsApi.adminReleasePayout(orderId);
            toast.success(result.message);
            setPayouts(prev => prev.filter(p => p.orderId !== orderId));
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to release payment'));
        } finally {
            setReleasing(null);
        }
    };

    const filteredPayouts = payouts.filter(p => {
        if (filter === 'eligible') return p.autoReleaseEligible;
        if (filter === 'waiting') return !p.autoReleaseEligible;
        return true;
    });

    const totalPending = payouts.reduce((sum, p) => sum + p.amount, 0);
    const totalNetPayout = payouts.reduce((sum, p) => sum + p.netAmount, 0);
    const totalFees = payouts.reduce((sum, p) => sum + p.platformFee, 0);
    const eligibleCount = payouts.filter(p => p.autoReleaseEligible).length;

    if (isAuthLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/30">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                            <div className="p-2 bg-emerald-600 rounded-xl text-white">
                                <span className="text-xl">💰</span>
                            </div>
                            Payout Management
                        </h1>
                        <p className="text-gray-500 mt-1">
                            Release escrowed payments to sellers after buyer delivery confirmation
                        </p>
                    </div>
                    <button
                        onClick={() => fetchPayouts()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                    >
                        🔄 Refresh
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Pending Payouts</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{payouts.length}</p>
                            </div>
                            <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center">
                                <span className="text-xl">⏳</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Total Escrowed</p>
                                <p className="text-2xl font-bold text-indigo-600 mt-1">৳{totalPending.toLocaleString()}</p>
                            </div>
                            <div className="w-11 h-11 bg-indigo-50 rounded-xl flex items-center justify-center">
                                <span className="text-xl">🔒</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Platform Fees</p>
                                <p className="text-2xl font-bold text-emerald-600 mt-1">৳{totalFees.toLocaleString()}</p>
                            </div>
                            <div className="w-11 h-11 bg-emerald-50 rounded-xl flex items-center justify-center">
                                <span className="text-xl">📊</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-500 font-medium">Ready to Release</p>
                                <p className="text-2xl font-bold text-green-600 mt-1">{eligibleCount}</p>
                            </div>
                            <div className="w-11 h-11 bg-green-50 rounded-xl flex items-center justify-center">
                                <span className="text-xl">✅</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6">
                    {[
                        { key: 'all' as const, label: `All (${payouts.length})` },
                        { key: 'eligible' as const, label: `Ready (${eligibleCount})` },
                        { key: 'waiting' as const, label: `Waiting (${payouts.length - eligibleCount})` },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setFilter(tab.key)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                filter === tab.key
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Payouts Table */}
                {loading ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                        <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent"></div>
                        </div>
                    </div>
                ) : filteredPayouts.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
                        <span className="text-5xl mb-4 block">🎉</span>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                            {filter === 'all' ? 'No Pending Payouts' : filter === 'eligible' ? 'No Ready Payouts' : 'No Waiting Payouts'}
                        </h3>
                        <p className="text-gray-500 text-sm">
                            {filter === 'all'
                                ? 'All seller payments have been released. Great job!'
                                : 'Try switching the filter to see other payouts.'}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-100">
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Buyer</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Seller</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fee</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Payout</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivered</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredPayouts.map((payout) => (
                                        <tr key={payout.orderId} className="hover:bg-gray-50/50 transition-colors">
                                            {/* Product */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    {payout.product?.images?.[0] && (
                                                        <Image
                                                            src={resolvePublicAssetUrl(payout.product.images[0])}
                                                            alt=""
                                                            width={40}
                                                            height={40}
                                                            className="w-10 h-10 rounded-lg object-cover border border-gray-200"
                                                        />
                                                    )}
                                                    <span className="text-sm font-medium text-gray-900 max-w-[180px] truncate">
                                                        {payout.product?.title || 'N/A'}
                                                    </span>
                                                </div>
                                            </td>
                                            {/* Buyer */}
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{payout.buyer?.name || 'N/A'}</p>
                                                    <p className="text-xs text-gray-500">{payout.buyer?.email}</p>
                                                </div>
                                            </td>
                                            {/* Seller */}
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-sm font-medium text-gray-900">{payout.seller?.name || 'N/A'}</p>
                                                    <p className="text-xs text-gray-500">{payout.seller?.email}</p>
                                                </div>
                                            </td>
                                            {/* Amount */}
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-semibold text-gray-900">৳{payout.amount.toLocaleString()}</span>
                                            </td>
                                            {/* Fee */}
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-red-500">-৳{payout.platformFee}</span>
                                            </td>
                                            {/* Net */}
                                            <td className="px-6 py-4">
                                                <span className="text-sm font-bold text-emerald-600">৳{payout.netAmount.toLocaleString()}</span>
                                            </td>
                                            {/* Delivered */}
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-sm text-gray-900">
                                                        {payout.deliveredAt ? new Date(payout.deliveredAt).toLocaleDateString() : 'N/A'}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{payout.hoursSinceDelivery}h ago</p>
                                                </div>
                                            </td>
                                            {/* Status */}
                                            <td className="px-6 py-4">
                                                {payout.autoReleaseEligible ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                                                        ✅ Ready
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                                                        ⏳ {24 - payout.hoursSinceDelivery}h left
                                                    </span>
                                                )}
                                            </td>
                                            {/* Action */}
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleRelease(payout.orderId)}
                                                    disabled={releasing === payout.orderId}
                                                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                                        payout.autoReleaseEligible
                                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                                                            : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                                                    } ${releasing === payout.orderId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                >
                                                    {releasing === payout.orderId ? '⏳...' : '💸 Release'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Table Footer */}
                        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                                Showing {filteredPayouts.length} of {payouts.length} pending payouts
                            </p>
                            <div className="text-sm text-gray-600">
                                Total to release: <span className="font-bold text-emerald-600">৳{totalNetPayout.toLocaleString()}</span>
                                {' '}(Fees: <span className="font-semibold text-gray-500">৳{totalFees.toLocaleString()}</span>)
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
