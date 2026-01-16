'use client';

import React, { useState, useEffect } from 'react';
import { FaTachometerAlt, FaMemory, FaClock, FaChartLine } from 'react-icons/fa';

interface PerformanceMetrics {
    fcp: number; // First Contentful Paint
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
    ttfb: number; // Time to First Byte
    memory?: number;
}

export default function PerformanceMonitor() {
    const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Only run in development or when enabled
        if (process.env.NODE_ENV === 'production' && !localStorage.getItem('show-perf-monitor')) {
            return;
        }

        const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
                if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
                    setMetrics(prev => ({ ...prev!, fcp: entry.startTime }));
                }
                if (entry.entryType === 'largest-contentful-paint') {
                    setMetrics(prev => ({ ...prev!, lcp: entry.startTime }));
                }
                if (entry.entryType === 'first-input') {
                    const fidEntry = entry as PerformanceEventTiming;
                    setMetrics(prev => ({ ...prev!, fid: fidEntry.processingStart - fidEntry.startTime }));
                }
                if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
                    setMetrics(prev => ({ ...prev!, cls: (prev?.cls || 0) + (entry as any).value }));
                }
            }
        });

        observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });

        // Get navigation timing
        const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navTiming) {
            setMetrics(prev => ({
                ...prev!,
                ttfb: navTiming.responseStart - navTiming.requestStart
            }));
        }

        // Get memory usage (Chrome only)
        if ('memory' in performance) {
            const memory = (performance as any).memory;
            setMetrics(prev => ({
                ...prev!,
                memory: memory.usedJSHeapSize / 1048576 // Convert to MB
            }));
        }

        // Initialize metrics
        setMetrics({
            fcp: 0,
            lcp: 0,
            fid: 0,
            cls: 0,
            ttfb: navTiming?.responseStart - navTiming?.requestStart || 0
        });

        // Toggle visibility with Ctrl+Shift+P
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'P') {
                setIsVisible(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => {
            observer.disconnect();
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, []);

    if (!metrics || !isVisible) return null;

    const getScoreColor = (metric: string, value: number) => {
        const thresholds: Record<string, { good: number; poor: number }> = {
            fcp: { good: 1800, poor: 3000 },
            lcp: { good: 2500, poor: 4000 },
            fid: { good: 100, poor: 300 },
            cls: { good: 0.1, poor: 0.25 },
            ttfb: { good: 800, poor: 1800 }
        };

        const threshold = thresholds[metric];
        if (!threshold) return 'text-gray-600';

        if (value <= threshold.good) return 'text-green-600';
        if (value <= threshold.poor) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="fixed bottom-4 left-4 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 w-80 text-xs">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <FaTachometerAlt className="text-indigo-600" />
                    Performance Metrics
                </h3>
                <button
                    onClick={() => setIsVisible(false)}
                    className="text-gray-400 hover:text-gray-600"
                >
                    ✕
                </button>
            </div>

            <div className="space-y-2">
                <div className="flex justify-between">
                    <span className="text-gray-600">FCP (First Contentful Paint)</span>
                    <span className={`font-mono font-bold ${getScoreColor('fcp', metrics.fcp)}`}>
                        {metrics.fcp.toFixed(0)}ms
                    </span>
                </div>

                <div className="flex justify-between">
                    <span className="text-gray-600">LCP (Largest Contentful Paint)</span>
                    <span className={`font-mono font-bold ${getScoreColor('lcp', metrics.lcp)}`}>
                        {metrics.lcp.toFixed(0)}ms
                    </span>
                </div>

                <div className="flex justify-between">
                    <span className="text-gray-600">FID (First Input Delay)</span>
                    <span className={`font-mono font-bold ${getScoreColor('fid', metrics.fid)}`}>
                        {metrics.fid.toFixed(0)}ms
                    </span>
                </div>

                <div className="flex justify-between">
                    <span className="text-gray-600">CLS (Cumulative Layout Shift)</span>
                    <span className={`font-mono font-bold ${getScoreColor('cls', metrics.cls)}`}>
                        {metrics.cls.toFixed(3)}
                    </span>
                </div>

                <div className="flex justify-between">
                    <span className="text-gray-600">TTFB (Time to First Byte)</span>
                    <span className={`font-mono font-bold ${getScoreColor('ttfb', metrics.ttfb)}`}>
                        {metrics.ttfb.toFixed(0)}ms
                    </span>
                </div>

                {metrics.memory && (
                    <div className="flex justify-between pt-2 border-t">
                        <span className="text-gray-600 flex items-center gap-1">
                            <FaMemory />
                            Memory Usage
                        </span>
                        <span className="font-mono font-bold text-gray-900">
                            {metrics.memory.toFixed(1)} MB
                        </span>
                    </div>
                )}
            </div>

            <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                Press <kbd className="px-1 bg-gray-100 rounded border">Ctrl+Shift+P</kbd> to toggle
            </div>
        </div>
    );
}
