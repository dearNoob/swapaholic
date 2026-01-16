'use client';

import { FaEye, FaUsers, FaClock, FaChartLine, FaDesktop, FaMobileAlt, FaTabletAlt } from 'react-icons/fa';

interface TrafficData {
    totalViews: number;
    uniqueVisitors: number;
    avgTimeOnPage: number;
    bounceRate: number;
    viewsBySource: {
        direct: number;
        search: number;
        social: number;
        referral: number;
    };
    viewsByDevice: {
        desktop: number;
        mobile: number;
        tablet: number;
    };
}

interface TrafficAnalyticsProps {
    data: TrafficData;
}

export default function TrafficAnalytics({ data }: TrafficAnalyticsProps) {
    const sources = [
        { name: 'Search Engines', value: data.viewsBySource.search, color: 'bg-blue-500' },
        { name: 'Direct Traffic', value: data.viewsBySource.direct, color: 'bg-green-500' },
        { name: 'Social Media', value: data.viewsBySource.social, color: 'bg-purple-500' },
        { name: 'Referrals', value: data.viewsBySource.referral, color: 'bg-orange-500' },
    ];

    const devices = [
        { name: 'Desktop', value: data.viewsByDevice.desktop, icon: FaDesktop, color: 'text-blue-600' },
        { name: 'Mobile', value: data.viewsByDevice.mobile, icon: FaMobileAlt, color: 'text-green-600' },
        { name: 'Tablet', value: data.viewsByDevice.tablet, icon: FaTabletAlt, color: 'text-purple-600' },
    ];

    const totalViews = sources.reduce((sum, s) => sum + s.value, 0);

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FaChartLine className="text-indigo-600" />
                Traffic Analytics
            </h2>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <FaEye className="text-blue-600" />
                        <p className="text-sm text-gray-600">Total Views</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {data.totalViews.toLocaleString()}
                    </p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <FaUsers className="text-green-600" />
                        <p className="text-sm text-gray-600">Unique Visitors</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {data.uniqueVisitors.toLocaleString()}
                    </p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <FaClock className="text-purple-600" />
                        <p className="text-sm text-gray-600">Avg. Time</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {Math.floor(data.avgTimeOnPage / 60)}:{(data.avgTimeOnPage % 60).toString().padStart(2, '0')}
                    </p>
                </div>

                <div className="bg-orange-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <FaChartLine className="text-orange-600" />
                        <p className="text-sm text-gray-600">Bounce Rate</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {data.bounceRate}%
                    </p>
                </div>
            </div>

            {/* Traffic Sources */}
            <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Traffic Sources</h3>
                <div className="space-y-3">
                    {sources.map((source) => {
                        const percentage = (source.value / totalViews) * 100;
                        return (
                            <div key={source.name}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-gray-700">{source.name}</span>
                                    <span className="font-semibold text-gray-900">
                                        {source.value.toLocaleString()} ({percentage.toFixed(1)}%)
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`${source.color} h-2 rounded-full transition-all`}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Device Breakdown */}
            <div>
                <h3 className="font-semibold text-gray-900 mb-3">Device Breakdown</h3>
                <div className="grid grid-cols-3 gap-3">
                    {devices.map((device) => {
                        const DeviceIcon = device.icon;
                        const total = data.viewsByDevice.desktop + data.viewsByDevice.mobile + data.viewsByDevice.tablet;
                        const percentage = (device.value / total) * 100;

                        return (
                            <div key={device.name} className="text-center p-3 bg-gray-50 rounded-lg">
                                <DeviceIcon className={`text-3xl ${device.color} mx-auto mb-2`} />
                                <p className="text-sm text-gray-600 mb-1">{device.name}</p>
                                <p className="text-lg font-bold text-gray-900">{percentage.toFixed(1)}%</p>
                                <p className="text-xs text-gray-500">{device.value.toLocaleString()} views</p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
