'use client';

import React from 'react';
import {
    FaExclamationTriangle, FaCheckCircle, FaInfoCircle,
    FaShoppingCart, FaClipboardCheck, FaBalanceScale,
    FaHeadset, FaCreditCard, FaShieldAlt
} from 'react-icons/fa';

interface Alert {
    category: string;
    severity: 'info' | 'warning' | 'critical';
    pending?: number;
    open?: number;
    failed?: number;
    escrowedOld?: number;
}

interface SystemAlertsProps {
    health: {
        health: string;
        alerts: Alert[];
    } | null;
}

const getAlertConfig = (alert: Alert) => {
    const configs: Record<string, { icon: React.ElementType; label: string; valueKey: string; valueLabel: string }> = {
        orders: { icon: FaShoppingCart, label: 'Pending Orders', valueKey: 'pending', valueLabel: 'pending' },
        qc: { icon: FaClipboardCheck, label: 'QC Pending', valueKey: 'pending', valueLabel: 'awaiting review' },
        disputes: { icon: FaBalanceScale, label: 'Open Disputes', valueKey: 'open', valueLabel: 'open' },
        tickets: { icon: FaHeadset, label: 'Support Tickets', valueKey: 'open', valueLabel: 'open' },
        payments: {
            icon: FaCreditCard,
            label: alert.failed !== undefined ? 'Failed Payments' : 'Old Escrow',
            valueKey: alert.failed !== undefined ? 'failed' : 'escrowedOld',
            valueLabel: alert.failed !== undefined ? 'failed' : '7+ days old',
        },
    };
    return configs[alert.category] || { icon: FaInfoCircle, label: alert.category, valueKey: 'pending', valueLabel: '' };
};

const getSeverityStyles = (severity: string) => {
    switch (severity) {
        case 'warning':
            return {
                bg: 'bg-amber-50',
                border: 'border-amber-200',
                icon: 'text-amber-500',
                badge: 'bg-amber-100 text-amber-700',
                iconComponent: FaExclamationTriangle,
            };
        case 'critical':
            return {
                bg: 'bg-red-50',
                border: 'border-red-200',
                icon: 'text-red-500',
                badge: 'bg-red-100 text-red-700',
                iconComponent: FaExclamationTriangle,
            };
        default:
            return {
                bg: 'bg-green-50',
                border: 'border-green-200',
                icon: 'text-green-500',
                badge: 'bg-green-100 text-green-700',
                iconComponent: FaCheckCircle,
            };
    }
};

export default function SystemAlerts({ health }: SystemAlertsProps) {
    if (!health) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FaShieldAlt className="text-indigo-600" /> System Health
                </h3>
                <div className="text-gray-400 text-center py-8">Loading system health...</div>
            </div>
        );
    }

    const overallStatus = health.health;
    const activeAlerts = health.alerts.filter((a) => {
        const value = (a as any)[getAlertConfig(a).valueKey];
        return value > 0;
    });

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FaShieldAlt className="text-indigo-600" /> System Health
                </h3>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${
                    overallStatus === 'good'
                        ? 'bg-green-100 text-green-700'
                        : overallStatus === 'warning'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                }`}>
                    {overallStatus === 'good' ? <FaCheckCircle /> : <FaExclamationTriangle />}
                    {overallStatus === 'good' ? 'All Systems Healthy' : overallStatus.charAt(0).toUpperCase() + overallStatus.slice(1)}
                </div>
            </div>

            {/* Alerts */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1 admin-scrollbar">
                {activeAlerts.length === 0 ? (
                    <div className="text-center py-6">
                        <FaCheckCircle className="text-4xl text-green-400 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No active alerts. All systems operational.</p>
                    </div>
                ) : (
                    activeAlerts.map((alert, index) => {
                        const config = getAlertConfig(alert);
                        const styles = getSeverityStyles(alert.severity);
                        const value = (alert as any)[config.valueKey];
                        const Icon = config.icon;

                        return (
                            <div
                                key={`${alert.category}-${index}`}
                                className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-md ${styles.bg} ${styles.border}`}
                            >
                                <div className={`p-2.5 rounded-lg ${styles.badge}`}>
                                    <Icon className="text-lg" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 text-sm">{config.label}</p>
                                    <p className="text-xs text-gray-500">{value} {config.valueLabel}</p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${styles.badge}`}>
                                    {alert.severity.toUpperCase()}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
