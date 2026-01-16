'use client';

import React, { useState } from 'react';
import { FaHistory, FaSearch, FaFilter, FaUserShield, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';

interface AuditLog {
    id: string;
    timestamp: Date;
    userId: string;
    username: string;
    action: 'create' | 'update' | 'delete' | 'login' | 'permission_change' | 'ban' | 'other';
    resource: string;
    details: string;
    ipAddress?: string;
}

interface AuditLogViewerProps {
    logs?: AuditLog[];
    onExport?: (format: 'csv' | 'json') => void;
}

export default function AuditLogViewer({ logs = [], onExport }: AuditLogViewerProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterAction, setFilterAction] = useState<'all' | AuditLog['action']>('all');
    const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');

    const getActionIcon = (action: AuditLog['action']) => {
        const icons = {
            create: <FaPlus className="text-green-600" />,
            update: <FaEdit className="text-blue-600" />,
            delete: <FaTrash className="text-red-600" />,
            login: <FaUserShield className="text-indigo-600" />,
            permission_change: <FaUserShield className="text-orange-600" />,
            ban: <FaTrash className="text-red-700" />,
            other: <FaHistory className="text-gray-600" />
        };
        return icons[action];
    };

    const getActionBadge = (action: AuditLog['action']) => {
        const badges = {
            create: 'bg-green-100 text-green-700',
            update: 'bg-blue-100 text-blue-700',
            delete: 'bg-red-100 text-red-700',
            login: 'bg-indigo-100 text-indigo-700',
            permission_change: 'bg-orange-100 text-orange-700',
            ban: 'bg-red-200 text-red-800',
            other: 'bg-gray-100 text-gray-700'
        };
        return badges[action];
    };

    const filterByDate = (log: AuditLog) => {
        const now = new Date();
        const logDate = new Date(log.timestamp);

        switch (dateFilter) {
            case 'today':
                return logDate.toDateString() === now.toDateString();
            case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return logDate >= weekAgo;
            case 'month':
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                return logDate >= monthAgo;
            default:
                return true;
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.details.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesAction = filterAction === 'all' || log.action === filterAction;
        const matchesDate = filterByDate(log);

        return matchesSearch && matchesAction && matchesDate;
    });

    const formatTimestamp = (date: Date) => {
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FaHistory className="text-indigo-600" />
                    Audit Log
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => onExport?.('csv')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                    >
                        Export CSV
                    </button>
                    <button
                        onClick={() => onExport?.('json')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                    >
                        Export JSON
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <select
                        value={filterAction}
                        onChange={(e) => setFilterAction(e.target.value as any)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Actions</option>
                        <option value="create">Create</option>
                        <option value="update">Update</option>
                        <option value="delete">Delete</option>
                        <option value="login">Login</option>
                        <option value="permission_change">Permission Change</option>
                        <option value="ban">Ban</option>
                    </select>

                    <select
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value as any)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">Last 7 Days</option>
                        <option value="month">Last 30 Days</option>
                    </select>
                </div>
            </div>

            {/* Logs */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto max-h-[600px]">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Timestamp
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Action
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Resource
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Details
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    IP Address
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredLogs.map(log => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        {formatTimestamp(log.timestamp)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="font-medium text-gray-900">{log.username}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${getActionBadge(log.action)}`}>
                                            {getActionIcon(log.action)}
                                            {log.action.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
                                        {log.resource}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 max-w-md truncate">
                                        {log.details}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                                        {log.ipAddress || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredLogs.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <FaHistory className="text-4xl mx-auto mb-3 text-gray-300" />
                        <p>No audit logs found</p>
                    </div>
                )}
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                Showing {filteredLogs.length} of {logs.length} log entries
            </div>
        </div>
    );
}
