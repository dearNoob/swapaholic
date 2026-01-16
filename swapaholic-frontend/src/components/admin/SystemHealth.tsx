'use client';

import React from 'react';
import { FaServer, FaMemory, FaHdd, FaChartLine, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface SystemMetrics {
    cpu: {
        usage: number;
        cores: number;
        temperature?: number;
    };
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
    disk: {
        used: number;
        total: number;
        percentage: number;
    };
    network: {
        inbound: number;
        outbound: number;
    };
    uptime: number;
    activeUsers: number;
    requestsPerMinute: number;
}

interface SystemHealthProps {
    metrics?: SystemMetrics;
    historicalData?: Array<{
        timestamp: string;
        cpu: number;
        memory: number;
        requests: number;
    }>;
}

export default function SystemHealth({ metrics, historicalData }: SystemHealthProps) {
    // Mock data
    const defaultMetrics: SystemMetrics = {
        cpu: { usage: 45.3, cores: 8, temperature: 62 },
        memory: { used: 12.5, total: 32, percentage: 39 },
        disk: { used: 245, total: 500, percentage: 49 },
        network: { inbound: 125.5, outbound: 78.2 },
        uptime: 172800, // 2 days in seconds
        activeUsers: 1247,
        requestsPerMinute: 342
    };

    const defaultHistory = Array.from({ length: 24 }, (_, i) => ({
        timestamp: `${i}:00`,
        cpu: Math.random() * 70 + 20,
        memory: Math.random() * 60 + 30,
        requests: Math.random() * 500 + 100
    }));

    const data = metrics || defaultMetrics;
    const history = historicalData || defaultHistory;

    const formatUptime = (seconds: number) => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        return `${days}d ${hours}h`;
    };

    const getHealthStatus = () => {
        if (data.cpu.usage > 80 || data.memory.percentage > 85 || data.disk.percentage > 90) {
            return { status: 'critical', color: 'red', icon: FaExclamationTriangle };
        }
        if (data.cpu.usage > 60 || data.memory.percentage > 70 || data.disk.percentage > 75) {
            return { status: 'warning', color: 'yellow', icon: FaExclamationTriangle };
        }
        return { status: 'healthy', color: 'green', icon: FaCheckCircle };
    };

    const health = getHealthStatus();

    const MetricCard = ({ icon: Icon, label, value, max, unit, percentage }: any) => {
        let statusColor = 'green';
        if (percentage > 80) statusColor = 'red';
        else if (percentage > 60) statusColor = 'yellow';

        return (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 bg-${statusColor}-50 rounded-lg`}>
                            <Icon className={`text-${statusColor}-600 text-xl`} />
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">{label}</p>
                            <p className="text-2xl font-bold text-gray-900">
                                {value}{unit}
                                {max && <span className="text-sm text-gray-500 font-normal"> / {max}{unit}</span>}
                            </p>
                        </div>
                    </div>
                    {percentage !== undefined && (
                        <div className={`text-3xl font-bold text-${statusColor}-600`}>
                            {percentage}%
                        </div>
                    )}
                </div>
                {percentage !== undefined && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className={`bg-${statusColor}-500 h-2 rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FaServer className="text-indigo-600" />
                    System Health
                </h2>
                <div className={`flex items-center gap-2 px-4 py-2 bg-${health.color}-50 text-${health.color}-700 rounded-lg font-semibold`}>
                    <health.icon />
                    <span className="capitalize">{health.status}</span>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                    <p className="text-sm text-gray-600 mb-1">Uptime</p>
                    <p className="text-3xl font-bold text-gray-900">{formatUptime(data.uptime)}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                    <p className="text-sm text-gray-600 mb-1">Active Users</p>
                    <p className="text-3xl font-bold text-indigo-600">{data.activeUsers.toLocaleString()}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                    <p className="text-sm text-gray-600 mb-1">Requests/min</p>
                    <p className="text-3xl font-bold text-green-600">{data.requestsPerMinute}</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
                    <p className="text-sm text-gray-600 mb-1">CPU Cores</p>
                    <p className="text-3xl font-bold text-gray-900">{data.cpu.cores}</p>
                </div>
            </div>

            {/* Resource Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MetricCard
                    icon={FaChartLine}
                    label="CPU Usage"
                    value={data.cpu.usage.toFixed(1)}
                    unit="%"
                    percentage={data.cpu.usage}
                />
                <MetricCard
                    icon={FaMemory}
                    label="Memory"
                    value={data.memory.used.toFixed(1)}
                    max={data.memory.total}
                    unit=" GB"
                    percentage={data.memory.percentage}
                />
                <MetricCard
                    icon={FaHdd}
                    label="Disk Space"
                    value={data.disk.used}
                    max={data.disk.total}
                    unit=" GB"
                    percentage={data.disk.percentage}
                />
            </div>

            {/* Historical Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">CPU & Memory Usage (24h)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="timestamp" />
                                <YAxis />
                                <Tooltip />
                                <Area type="monotone" dataKey="cpu" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.2} name="CPU %" />
                                <Area type="monotone" dataKey="memory" stroke="#10B981" fill="#10B981" fillOpacity={0.2} name="Memory %" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Request Rate (24h)</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="timestamp" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="requests" stroke="#F59E0B" strokeWidth={2} name="Requests/min" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
