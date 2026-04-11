'use client';
import { FaChartLine } from 'react-icons/fa';

interface SalesChartProps {
    data: {
        date: string;
        revenue: number;
    }[];
    currentPeriod: '7d' | '30d' | '90d';
    onPeriodChange: (period: '7d' | '30d' | '90d') => void;
}

export default function SalesChart({ data, currentPeriod, onPeriodChange }: SalesChartProps) {
    // Calculate max revenue for scaling
    const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
    const yAxisSteps = 5;
    const stepValue = Math.ceil(maxRevenue / yAxisSteps);

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FaChartLine className="text-indigo-600" />
                    Sales Analytics
                </h2>
                <select
                    value={currentPeriod}
                    onChange={(e) => onPeriodChange(e.target.value as '7d' | '30d' | '90d')}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                </select>
            </div>

            {/* Simple SVG Chart */}
            <div className="relative h-64">
                <svg className="w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="none">
                    {/* Grid lines */}
                    {Array.from({ length: yAxisSteps + 1 }).map((_, i) => {
                        const y = (300 / yAxisSteps) * i;
                        return (
                            <g key={i}>
                                <line x1="0" y1={y} x2="800" y2={y} stroke="#e5e7eb" strokeWidth="1" />
                                <text x="-10" y={y + 4} className="text-xs fill-gray-500" textAnchor="end">
                                    ৳{stepValue * (yAxisSteps - i)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Line chart */}
                    {data.length > 0 && (
                        <>
                            <polyline
                                points={data.map((d, i) => {
                                    const x = (800 / (data.length - 1 || 1)) * i;
                                    const y = 300 - (d.revenue / maxRevenue) * 300;
                                    return `${x},${y}`;
                                }).join(' ')}
                                fill="none"
                                stroke="#4f46e5"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />

                            {/* Area under the line */}
                            <polygon
                                points={`0,300 ${data.map((d, i) => {
                                    const x = (800 / (data.length - 1 || 1)) * i;
                                    const y = 300 - (d.revenue / maxRevenue) * 300;
                                    return `${x},${y}`;
                                }).join(' ')} ${800},300`}
                                fill="url(#gradient)"
                                opacity="0.3"
                            />

                            {/* Data points */}
                            {data.map((d, i) => {
                                const x = (800 / (data.length - 1 || 1)) * i;
                                const y = 300 - (d.revenue / maxRevenue) * 300;
                                return (
                                    <circle
                                        key={i}
                                        cx={x}
                                        cy={y}
                                        r="5"
                                        fill="#4f46e5"
                                        className="hover:r-7 transition-all cursor-pointer"
                                    >
                                        <title>{`${d.date}: ৳${d.revenue}`}</title>
                                    </circle>
                                );
                            })}

                            {/* Gradient definition */}
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                        </>
                    )}
                </svg>

                {/* X-axis labels */}
                <div className="flex justify-between mt-2 px-2">
                    {data.slice(0, 7).map((d, i) => (
                        <span key={i} className="text-xs text-gray-500">
                            {new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                    ))}
                </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                <div>
                    <p className="text-sm text-gray-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                        ৳{data.reduce((sum, d) => sum + d.revenue, 0).toLocaleString()}
                    </p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Average Per Day</p>
                    <p className="text-2xl font-bold text-gray-900">
                        ৳{Math.round(data.reduce((sum, d) => sum + d.revenue, 0) / (data.length || 1)).toLocaleString()}
                    </p>
                </div>
                <div>
                    <p className="text-sm text-gray-600">Peak Day</p>
                    <p className="text-2xl font-bold text-gray-900">
                        ৳{Math.max(...data.map(d => d.revenue)).toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    );
}
