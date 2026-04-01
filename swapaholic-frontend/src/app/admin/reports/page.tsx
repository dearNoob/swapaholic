'use client';

import { useState, useEffect } from 'react';
import { FaFlag, FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { reportsApi } from '../../../api/reports';
import { useRequireAdminAuth } from '../../../hooks/useRequireAdminAuth';

export default function ReportsQueuePage() {
    const [reports, setReports] = useState<any[]>([]);
    // Protect route with admin auth
    const { isLoading: isAuthLoading, isAdmin } = useRequireAdminAuth();
    const [isDataLoading, setIsDataLoading] = useState(true);

    // Combined loading state
    const isLoading = isAuthLoading || isDataLoading;

    const [filter, setFilter] = useState({ status: 'all', type: 'all' });
    const [selectedReport, setSelectedReport] = useState<any>(null);

    useEffect(() => {
        if (isAdmin) {
            fetchReports();
        }
    }, [filter, isAdmin]);

    const fetchReports = async () => {
        try {
            setIsDataLoading(true);
            const params: any = {};
            if (filter.status !== 'all') params.status = filter.status;
            if (filter.type !== 'all') params.type = filter.type;

            const data = await reportsApi.getAllReports(params);
            setReports(data.reports || []);
        } catch (err) {
            console.error('Error fetching reports:', err);
            // Mock data
            setReports(Array.from({ length: 15 }, (_, i) => ({
                id: `report-${i + 1}`,
                type: ['product', 'user', 'review', 'content'][Math.floor(Math.random() * 4)],
                targetId: `target-${i + 1}`,
                targetName: `Target Item ${i + 1}`,
                reportedBy: `User ${i + 1}`,
                reason: ['Spam', 'Inappropriate', 'Fraud', 'Offensive'][Math.floor(Math.random() * 4)],
                details: 'Report details go here...',
                status: ['pending', 'reviewed', 'dismissed'][Math.floor(Math.random() * 3)],
                createdAt: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
            })));
        } finally {
            setIsDataLoading(false);
        }
    };

    const handleReview = async (reportId: string, action: 'dismiss' | 'action_taken' | 'escalate') => {
        const notes = prompt('Review notes:');
        if (notes) {
            try {
                await reportsApi.reviewReport(reportId, action, notes);
                toast.success('Report reviewed successfully');
                fetchReports();
                setSelectedReport(null);
            } catch (err) {
                toast.error('Failed to review report');
            }
        }
    };

    const getTypeIcon = (type: string) => {
        return <FaFlag className="text-red-600" />;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return { text: 'Pending', class: 'bg-yellow-100 text-yellow-800', icon: FaExclamationTriangle };
            case 'reviewed':
                return { text: 'Reviewed', class: 'bg-green-100 text-green-800', icon: FaCheckCircle };
            case 'dismissed':
                return { text: 'Dismissed', class: 'bg-gray-100 text-gray-800', icon: FaTimesCircle };
            default:
                return { text: status, class: 'bg-gray-100 text-gray-800', icon: FaFlag };
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                        Reports Queue 🚩
                    </h1>
                    <p className="text-lg text-gray-600">
                        Review and manage user reports
                    </p>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Status Filter */}
                        <div className="flex gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-700 self-center mr-2">Status:</span>
                            {['all', 'pending', 'reviewed', 'dismissed'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilter({ ...filter, status })}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter.status === status
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {status.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {/* Type Filter */}
                        <div className="flex gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-700 self-center mr-2">Type:</span>
                            {['all', 'product', 'user', 'review', 'content'].map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setFilter({ ...filter, type })}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter.type === type
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {type.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Reports List */}
                {isLoading ? (
                    <div className="text-center py-16">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
                        <p className="text-gray-600">Loading reports...</p>
                    </div>
                ) : reports.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <FaCheckCircle className="mx-auto text-6xl text-green-500 mb-4" />
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">No Reports!</h3>
                        <p className="text-gray-600">All reports have been reviewed</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reported By</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reason</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {reports.map((report) => {
                                        const statusBadge = getStatusBadge(report.status);
                                        const StatusIcon = statusBadge.icon;

                                        return (
                                            <tr key={report.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                                                        {report.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="font-semibold text-gray-900">{report.targetName}</p>
                                                    <p className="text-xs text-gray-500">ID: {report.targetId}</p>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {report.reportedBy}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-sm font-semibold text-gray-900">{report.reason}</p>
                                                    <p className="text-xs text-gray-500 truncate max-w-xs">{report.details}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusBadge.class}`}>
                                                        <StatusIcon />
                                                        {statusBadge.text}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {new Date(report.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {report.status === 'pending' && (
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => handleReview(report.id, 'action_taken')}
                                                                className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                                                title="Take action"
                                                            >
                                                                Action
                                                            </button>
                                                            <button
                                                                onClick={() => handleReview(report.id, 'dismiss')}
                                                                className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                                                                title="Dismiss"
                                                            >
                                                                Dismiss
                                                            </button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
