'use client';

import React, { useState, useEffect } from 'react';
import { FaPlus, FaCreditCard, FaTrash, FaCheck, FaLock } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { paymentsApi, PaymentMethod, AddPaymentMethodData } from '@/api/payments';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';

interface PaymentMethodsProps {
    methods?: PaymentMethod[];
    onMethodSelect?: (method: PaymentMethod) => void;
    onAddMethod?: (method: PaymentMethod) => void;
    onDeleteMethod?: (id: string) => void;
    onSetDefault?: (id: string) => void;
}

export default function PaymentMethods({
    methods: initialMethods,
    onMethodSelect,
    onAddMethod,
    onDeleteMethod,
    onSetDefault
}: PaymentMethodsProps) {
    const [methods, setMethods] = useState<PaymentMethod[]>(initialMethods || []);
    const [isLoading, setIsLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [selectedId, setSelectedId] = useState<string | null>(
        methods.find(m => m.isDefault)?.id || null
    );
    const [formData, setFormData] = useState<AddPaymentMethodData>({
        type: 'card',
        cardNumber: '',
        expiryMonth: 1,
        expiryYear: new Date().getFullYear(),
        cvv: '',
        cardholderName: ''
    });

    // Fetch payment methods on mount if not provided
    useEffect(() => {
        if (!initialMethods) {
            fetchPaymentMethods();
        }
    }, [initialMethods]);

    const fetchPaymentMethods = async () => {
        setIsLoading(true);
        try {
            const data = await paymentsApi.getPaymentMethods();
            setMethods(data);
        } catch (error) {
            showErrorToast(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const newMethod = await paymentsApi.addPaymentMethod(formData);
            setMethods([...methods, newMethod]);
            onAddMethod?.(newMethod);
            showSuccessToast('Payment method added');
            setIsAdding(false);
            setFormData({
                type: 'card',
                cardNumber: '',
                expiryMonth: 1,
                expiryYear: new Date().getFullYear(),
                cvv: '',
                cardholderName: ''
            });
        } catch (error) {
            showErrorToast(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remove this payment method?')) return;

        setIsLoading(true);
        try {
            await paymentsApi.removePaymentMethod(id);
            setMethods(methods.filter(m => m.id !== id));
            onDeleteMethod?.(id);
            showSuccessToast('Payment method removed');
        } catch (error) {
            showErrorToast(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetDefault = async (id: string) => {
        setIsLoading(true);
        try {
            await paymentsApi.setDefaultPaymentMethod(id);
            setMethods(methods.map(m => ({ ...m, isDefault: m.id === id })));
            onSetDefault?.(id);
            showSuccessToast('Default payment method updated');
        } catch (error) {
            showErrorToast(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelect = (method: PaymentMethod) => {
        setSelectedId(method.id);
        onMethodSelect?.(method);
    };

    const getCardIcon = (brand?: string) => {
        const icons: Record<string, string> = {
            visa: '💳',
            mastercard: '💳',
            amex: '💳',
            discover: '💳'
        };
        return icons[brand || ''] || '💳';
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Payment Methods</h3>
                <button
                    onClick={() => setIsAdding(true)}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                    <FaPlus />
                    Add Card
                </button>
            </div>

            {/* Add Card Form */}
            {isAdding && (
                <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6 space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <FaLock />
                        <span>Your payment information is encrypted and secure</span>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Card Number *
                        </label>
                        <input
                            type="text"
                            value={formData.cardNumber}
                            onChange={(e) => {
                                const value = e.target.value.replace(/\s/g, '');
                                if (value.length <= 16 && /^\d*$/.test(value)) {
                                    setFormData({ ...formData, cardNumber: value });
                                }
                            }}
                            placeholder="1234 5678 9012 3456"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Month *
                            </label>
                            <select
                                value={formData.expiryMonth}
                                onChange={(e) => setFormData({ ...formData, expiryMonth: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                required
                            >
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                    <option key={month} value={month}>
                                        {month.toString().padStart(2, '0')}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Year *
                            </label>
                            <select
                                value={formData.expiryYear}
                                onChange={(e) => setFormData({ ...formData, expiryYear: parseInt(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                required
                            >
                                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                                    <option key={year} value={year}>
                                        {year}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                CVV *
                            </label>
                            <input
                                type="text"
                                value={formData.cvv}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    if (value.length <= 4 && /^\d*$/.test(value)) {
                                        setFormData({ ...formData, cvv: value });
                                    }
                                }}
                                placeholder="123"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cardholder Name *
                        </label>
                        <input
                            type="text"
                            value={formData.cardholderName}
                            onChange={(e) => setFormData({ ...formData, cardholderName: e.target.value })}
                            placeholder="JOHN DOE"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            required
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                        >
                            {isLoading ? 'Saving...' : 'Save Card'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsAdding(false)}
                            className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Saved Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {methods.map((method) => (
                    <div
                        key={method.id}
                        className={`
              relative border-2 rounded-lg p-4 cursor-pointer transition-all
              ${selectedId === method.id
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-gray-200 hover:border-indigo-300'
                            }
            `}
                        onClick={() => handleSelect(method)}
                    >
                        {selectedId === method.id && (
                            <div className="absolute top-4 right-4 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                                <FaCheck className="text-white text-xs" />
                            </div>
                        )}

                        {method.isDefault && (
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full mb-2">
                                Default
                            </span>
                        )}

                        <div className="flex items-center gap-3 pr-10">
                            <div className="text-3xl">
                                {getCardIcon(method.brand)}
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-900 capitalize">
                                    {method.brand || 'Card'}
                                </p>
                                <p className="text-sm text-gray-600">
                                    •••• {method.last4}
                                </p>
                                <p className="text-xs text-gray-500">
                                    Expires {method.expiryMonth}/{method.expiryYear}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4 pt-4 border-t">
                            {!method.isDefault && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetDefault(method.id);
                                    }}
                                    disabled={isLoading}
                                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
                                >
                                    Set as Default
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(method.id);
                                }}
                                disabled={isLoading}
                                className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1 disabled:opacity-50"
                            >
                                <FaTrash />
                                Remove
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {methods.length === 0 && !isAdding && (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <FaCreditCard className="text-4xl text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No saved payment methods</p>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        Add your first card
                    </button>
                </div>
            )}
        </div>
    );
}
