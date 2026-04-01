'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    FaTruck, FaClipboardCheck, FaBox, FaCheckCircle,
    FaSyncAlt, FaCalendarAlt, FaSignOutAlt, FaPlay,
    FaTimesCircle, FaHistory, FaTasks, FaSearch, FaUser
} from 'react-icons/fa';
import { logisticsApi } from '../../../api/logistics';
import { toast } from 'react-toastify';
import { useRequireLogisticsAuth } from '../../../hooks/useRequireLogisticsAuth';
import { useAppDispatch } from '../../../store/hooks';
import { logout } from '../../../store/authSlice';
import { useRouter } from 'next/navigation';
import { tokenManager } from '../../../utils/tokenManager';
import { QCActionModal } from '../../../components/logistics/QCActionModal';

export default function LogisticsDashboardPage() {
    const { isLoading: isAuthLoading, isLogistics, user } = useRequireLogisticsAuth();
    const dispatch = useAppDispatch();
    const router = useRouter();
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
    const [activeTab, setActiveTab] = useState<'tasks' | 'history'>('tasks');

    const [stats, setStats] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [tasksPagination, setTasksPagination] = useState<any>(null);
    const [historyPagination, setHistoryPagination] = useState<any>(null);
    const [selectedQCTask, setSelectedQCTask] = useState<any>(null);

    const isLoading = isAuthLoading || isDataLoading;

    const fetchAllData = useCallback(async (showRefreshToast = false) => {
        try {
            if (showRefreshToast) setIsRefreshing(true);
            else setIsDataLoading(true);

            const [statsData, tasksData, historyData] = await Promise.allSettled([
                logisticsApi.getDashboardStats(),
                logisticsApi.getMyTasks({ limit: 20 }),
                logisticsApi.getTaskHistory({ limit: 20 }),
            ]);

            if (statsData.status === 'fulfilled') {
                setStats(statsData.value);
            } else {
                console.error('Failed to fetch stats:', statsData.reason);
                setStats({
                    qc: { total: 0, pending: 0, myInReview: 0, myApproved: 0, myRejected: 0 },
                    delivery: { total: 0, active: 0, completed: 0, failed: 0 },
                    today: { deliveriesCompleted: 0, qcCompleted: 0, totalCompleted: 0 }
                });
            }

            if (tasksData.status === 'fulfilled') {
                setTasks(tasksData.value.tasks || []);
                setTasksPagination(tasksData.value.pagination);
            }

            if (historyData.status === 'fulfilled') {
                setHistory(historyData.value.history || []);
                setHistoryPagination(historyData.value.pagination);
            }

            setLastRefreshed(new Date());
            if (showRefreshToast) toast.success('Dashboard refreshed');
        } catch (error) {
            console.error('Dashboard fetch error:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setIsDataLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        if (isLogistics) {
            fetchAllData();
        }
    }, [isLogistics, fetchAllData]);

    const handlePickupOrder = async (orderId: string) => {
        try {
            await logisticsApi.pickupOrder(orderId);
            toast.success('Order picked up! QC + Delivery assigned to you.');
            fetchAllData(true);
        } catch (error: any) {
            toast.error(error.message || 'Failed to pickup order');
        }
    };

    const handleDeliveryStatusUpdate = async (orderId: string, newStatus: string) => {
        try {
            await logisticsApi.updateDeliveryStatus(orderId, { status: newStatus });
            const labels: Record<string, string> = {
                picked_up: 'Marked as Picked Up!',
                in_transit: 'Marked as In Transit!',
                delivered: '🎉 Delivery Completed! Order auto-completed.',
            };
            toast.success(labels[newStatus] || 'Delivery status updated');
            fetchAllData(true);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update delivery status');
        }
    };

    const handleLogout = () => {
        dispatch(logout());
        tokenManager.clearTokens();
        router.replace('/logistics/login');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900/30 flex items-center justify-center">
                <div className="text-center">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto" />
                        <FaTruck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-teal-500 text-lg" />
                    </div>
                    <p className="text-gray-400 mt-4 font-medium">Loading Logistics Dashboard...</p>
                </div>
            </div>
        );
    }

    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const statCards = [
        {
            title: 'Pending QC',
            value: stats?.qc?.pending || 0,
            icon: FaClipboardCheck,
            gradient: 'from-amber-500 to-orange-500',
            desc: 'Awaiting inspection'
        },
        {
            title: 'Active Deliveries',
            value: stats?.delivery?.active || 0,
            icon: FaTruck,
            gradient: 'from-blue-500 to-cyan-500',
            desc: 'In progress'
        },
        {
            title: 'Completed Today',
            value: stats?.today?.totalCompleted || 0,
            icon: FaCheckCircle,
            gradient: 'from-emerald-500 to-green-500',
            desc: `${stats?.today?.qcCompleted || 0} QC + ${stats?.today?.deliveriesCompleted || 0} deliveries`
        },
        {
            title: 'Total Deliveries',
            value: stats?.delivery?.completed || 0,
            icon: FaBox,
            gradient: 'from-violet-500 to-purple-500',
            desc: `${stats?.delivery?.failed || 0} failed`
        },
    ];

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            in_review: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
            assigned: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
            picked_up: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
            in_transit: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
            delivered: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
            failed: 'bg-red-500/20 text-red-400 border-red-500/30',
            returned: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
        };
        return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    };

    return (
        <>
        <div className="min-h-screen">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl text-white shadow-lg shadow-teal-500/30">
                                <FaTruck className="text-xl" />
                            </div>
                            Logistics Dashboard
                        </h1>
                        <div className="flex items-center gap-3 mt-2">
                            <p className="text-gray-400 flex items-center gap-2">
                                <FaCalendarAlt className="text-xs" />
                                {currentDate}
                            </p>
                            <span className="text-gray-600">·</span>
                            <p className="text-gray-500 text-sm">
                                Welcome, {user?.firstName} {user?.lastName}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <p className="text-gray-500 text-xs hidden md:block">
                            Last: {lastRefreshed.toLocaleTimeString()}
                        </p>
                        <button
                            onClick={() => fetchAllData(true)}
                            disabled={isRefreshing}
                            className={`flex items-center gap-2 px-4 py-2.5 bg-slate-700/50 border border-slate-600 rounded-xl text-sm font-medium text-gray-300 hover:bg-slate-600/50 transition-all ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <FaSyncAlt className={`text-xs ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {statCards.map((card) => (
                        <div key={card.title} className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5 hover:border-teal-500/30 transition-all">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-gray-400 text-sm font-medium">{card.title}</p>
                                    <p className="text-3xl font-bold text-white mt-1">{card.value}</p>
                                    <p className="text-xs text-gray-500 mt-1">{card.desc}</p>
                                </div>
                                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg`}>
                                    <card.icon className="text-white text-lg" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* QC Quick Stats */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5 mb-8">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <FaClipboardCheck className="text-teal-400" />
                        QC Overview
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center p-3 bg-slate-700/30 rounded-xl">
                            <p className="text-2xl font-bold text-white">{stats?.qc?.total || 0}</p>
                            <p className="text-xs text-gray-400">Total QC</p>
                        </div>
                        <div className="text-center p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                            <p className="text-2xl font-bold text-amber-400">{stats?.qc?.pending || 0}</p>
                            <p className="text-xs text-gray-400">Pending</p>
                        </div>
                        <div className="text-center p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                            <p className="text-2xl font-bold text-blue-400">{stats?.qc?.myInReview || 0}</p>
                            <p className="text-xs text-gray-400">My In-Review</p>
                        </div>
                        <div className="text-center p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                            <p className="text-2xl font-bold text-emerald-400">{stats?.qc?.myApproved || 0}</p>
                            <p className="text-xs text-gray-400">My Approved</p>
                        </div>
                        <div className="text-center p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                            <p className="text-2xl font-bold text-red-400">{stats?.qc?.myRejected || 0}</p>
                            <p className="text-xs text-gray-400">My Rejected</p>
                        </div>
                    </div>
                </div>

                {/* Tabs: Active Tasks vs History */}
                <div className="mb-6">
                    <div className="flex gap-2 border-b border-slate-700">
                        <button
                            onClick={() => setActiveTab('tasks')}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === 'tasks' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
                        >
                            <FaTasks className="text-xs" />
                            Active Tasks ({tasks.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === 'history' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-400 hover:text-gray-300'}`}
                        >
                            <FaHistory className="text-xs" />
                            History ({history.length})
                        </button>
                    </div>
                </div>

                {/* Tasks Table */}
                {activeTab === 'tasks' && (
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
                        {tasks.length === 0 ? (
                            <div className="p-12 text-center">
                                <FaCheckCircle className="text-5xl text-emerald-500 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">All caught up!</h3>
                                <p className="text-gray-400">No active tasks right now.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Order / Item</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Info</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Created</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tasks.map((task: any) => (
                                            <tr key={task._id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${task.type === 'qc' ? 'bg-teal-500/20 text-teal-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                        {task.type === 'qc' ? <FaClipboardCheck className="text-[10px]" /> : <FaTruck className="text-[10px]" />}
                                                        {task.type === 'qc' ? 'QC' : 'Delivery'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-300">
                                                    <div>{task.product?.title || `Order #${String(task.orderId?._id || '').slice(-6)}`}</div>
                                                    <div className="text-xs text-gray-500">{task.seller ? `Seller: ${task.seller.firstName}` : ''}</div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                                                        {task.status?.replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-400">
                                                    {task.type === 'delivery' && task.pickupLocation ? task.pickupLocation : '—'}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-500">
                                                    {task.createdAt ? new Date(task.createdAt).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex gap-2 flex-wrap">
                                                        {/* QC Actions */}
                                                        {task.type === 'qc' && ['pending', 'in_review'].includes(task.status) && (
                                                            <button
                                                                onClick={() => setSelectedQCTask(task)}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-teal-600/20 text-teal-400 border border-teal-500/30 rounded-lg text-xs font-medium hover:bg-teal-600/30 transition-all"
                                                            >
                                                                <FaClipboardCheck className="text-[10px]" /> Inspect
                                                            </button>
                                                        )}
                                                        {task.type === 'qc' && task.status === 'pending' && (
                                                            <button
                                                                onClick={() => task.orderId?._id && handlePickupOrder(task.orderId._id)}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-slate-600/20 text-gray-400 border border-slate-500/30 rounded-lg text-xs font-medium hover:bg-slate-600/30 transition-all"
                                                            >
                                                                <FaPlay className="text-[10px]" /> Pickup
                                                            </button>
                                                        )}

                                                        {/* Delivery Actions */}
                                                        {task.type === 'delivery' && task.status === 'assigned' && (
                                                            <button
                                                                onClick={() => handleDeliveryStatusUpdate(task.orderId?._id, 'picked_up')}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium hover:bg-blue-600/30 transition-all"
                                                            >
                                                                📦 Picked Up
                                                            </button>
                                                        )}
                                                        {task.type === 'delivery' && task.status === 'picked_up' && (
                                                            <button
                                                                onClick={() => handleDeliveryStatusUpdate(task.orderId?._id, 'in_transit')}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 rounded-lg text-xs font-medium hover:bg-indigo-600/30 transition-all"
                                                            >
                                                                🚚 In Transit
                                                            </button>
                                                        )}
                                                        {task.type === 'delivery' && task.status === 'in_transit' && (
                                                            <button
                                                                onClick={() => handleDeliveryStatusUpdate(task.orderId?._id, 'delivered')}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-medium hover:bg-emerald-600/30 transition-all"
                                                            >
                                                                ✅ Mark Delivered
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* History Table */}
                {activeTab === 'history' && (
                    <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
                        {history.length === 0 ? (
                            <div className="p-12 text-center">
                                <FaHistory className="text-5xl text-gray-600 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-white mb-2">No history yet</h3>
                                <p className="text-gray-400">Completed tasks will appear here.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Order</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Result</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Quality Score</th>
                                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Completed</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((item: any) => (
                                            <tr key={item._id} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${item.type === 'qc' ? 'bg-teal-500/20 text-teal-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                        {item.type === 'qc' ? 'QC' : 'Delivery'}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-300">
                                                    {item.product?.title || (item.orderId?._id ? `#${String(item.orderId._id).slice(-6)}` : 'N/A')}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${item.status === 'approved' || item.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                        {item.status === 'approved' || item.status === 'delivered' ? <FaCheckCircle className="text-[10px]" /> : <FaTimesCircle className="text-[10px]" />}
                                                        {item.status?.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-400">
                                                    {item.type === 'qc' && item.qualityScore ? `${item.qualityScore}%` : '—'}
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-500">
                                                    {item.completedAt ? new Date(item.completedAt).toLocaleDateString() : 'N/A'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        {/* QC Action Modal */}
        {selectedQCTask && (
            <QCActionModal
                task={selectedQCTask}
                onClose={() => setSelectedQCTask(null)}
                onSuccess={() => { setSelectedQCTask(null); fetchAllData(true); }}
            />
        )}
        </>
    );
}
