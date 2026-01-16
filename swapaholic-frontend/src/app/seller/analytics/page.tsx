'use client';

import { useState, useEffect } from 'react';
import { FaDownload, FaFilePdf, FaFileCsv, FaCalendarAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { sellerApi } from '../../../api/seller';
import RevenueReports from '../../../components/seller/analytics/RevenueReports';
import BestSellingProducts from '../../../components/seller/analytics/BestSellingProducts';
import TrafficAnalytics from '../../../components/seller/analytics/TrafficAnalytics';
import ConversionMetrics from '../../../components/seller/analytics/ConversionMetrics';

export default function SellerAnalyticsPage() {
    const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
    const [isLoading, setIsLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState<any>(null);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        fetchAnalytics();
    }, [period]);

    const fetchAnalytics = async () => {
        try {
            setIsLoading(true);
            const data = await sellerApi.getAnalytics(period);
            setAnalyticsData(data);
        } catch (err) {
            console.error('Error fetching analytics:', err);
            toast.error('Failed to load analytics data');
            // Mock data for development
            setAnalyticsData({
                revenue: {
                    daily: Array.from({ length: 30 }, (_, i) => ({
                        date: new Date(Date.now() - (29 - i) * 86400000).toISOString(),
                        amount: Math.floor(Math.random() * 5000) + 1000,
                    })),
                    weekly: Array.from({ length: 12 }, (_, i) => ({
                        week: `Week ${i + 1}`,
                        amount: Math.floor(Math.random() * 20000) + 5000,
                    })),
                    monthly: Array.from({ length: 12 }, (_, i) => ({
                        month: new Date(2024, i).toLocaleDateString('en-US', { month: 'short' }),
                        amount: Math.floor(Math.random() * 50000) + 10000,
                    })),
                },
                bestSelling: Array.from({ length: 10 }, (_, i) => ({
                    id: `prod-${i + 1}`,
                    title: `Product ${i + 1}`,
                    image: '/placeholder-product.jpg',
                    sales: 150 - i * 10,
                    revenue: (150 - i * 10) * (Math.random() * 100 + 50),
                    views: (150 - i * 10) * 15,
                })),
                traffic: {
                    totalViews: 15234,
                    uniqueVisitors: 8921,
                    avgTimeOnPage: 245,
                    bounceRate: 32.5,
                    viewsBySource: {
                        direct: 4523,
                        search: 6234,
                        social: 2891,
                        referral: 1586,
                    },
                    viewsByDevice: {
                        desktop: 8234,
                        mobile: 5821,
                        tablet: 1179,
                    },
                },
                conversion: {
                    viewToBid: 12.5,
                    bidToSale: 45.3,
                    overallConversion: 5.7,
                    avgBidsPerListing: 8.4,
                },
            });
        } finally {
            setIsLoading(false);
        }
    };

    const exportToPDF = async () => {
        setIsExporting(true);
        try {
            await sellerApi.exportAnalytics('pdf', period);
            toast.success('PDF report downloaded');
        } catch (err) {
            console.error('Error exporting to PDF:', err);
            toast.error('Failed to export PDF');
        } finally {
            setIsExporting(false);
        }
    };

    const exportToCSV = async () => {
        setIsExporting(true);
        try {
            await sellerApi.exportAnalytics('csv', period);
            toast.success('CSV report downloaded');
        } catch (err) {
            console.error('Error exporting to CSV:', err);
            toast.error('Failed to export CSV');
        } finally {
            setIsExporting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
                    <p className="text-gray-600">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                            Analytics & Reports 📊
                        </h1>
                        <p className="text-lg text-gray-600">
                            Detailed insights into your sales performance
                        </p>
                    </div>

                    <div className="flex gap-3 mt-4 md:mt-0">
                        {/* Period Selector */}
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow">
                            <FaCalendarAlt className="text-gray-500" />
                            <select
                                value={period}
                                onChange={(e) => setPeriod(e.target.value as any)}
                                className="border-0 focus:ring-0 text-sm font-medium text-gray-900 bg-transparent"
                            >
                                <option value="7d">Last 7 Days</option>
                                <option value="30d">Last 30 Days</option>
                                <option value="90d">Last 90 Days</option>
                                <option value="1y">Last Year</option>
                            </select>
                        </div>

                        {/* Export Buttons */}
                        <button
                            onClick={exportToPDF}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                        >
                            <FaFilePdf />
                            Export PDF
                        </button>
                        <button
                            onClick={exportToCSV}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                        >
                            <FaFileCsv />
                            Export CSV
                        </button>
                    </div>
                </div>

                {/* Revenue Reports */}
                <div className="mb-8">
                    <RevenueReports data={analyticsData.revenue} />
                </div>

                {/* Conversion Metrics */}
                <div className="mb-8">
                    <ConversionMetrics data={analyticsData.conversion} />
                </div>

                {/* Two Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Best Selling Products */}
                    <BestSellingProducts products={analyticsData.bestSelling} />

                    {/* Traffic Analytics */}
                    <TrafficAnalytics data={analyticsData.traffic} />
                </div>
            </div>
        </div>
    );
}
