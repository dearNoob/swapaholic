'use client';

import React from 'react';
import StripeCheckoutButton from '../payments/StripeCheckoutButton';

type Method = 'stripe' | 'paypal' | 'escrow' | 'bkash' | 'rocket' | 'nagad' | null;

interface Props {
    selected: Method;
    onSelect: (method: Method) => void;
}

export default function PaymentMethodSelector({ selected, onSelect }: Props) {
    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Payment Method</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {/* International Payment Methods */}
                <button
                    className={`px-4 py-3 rounded-lg border-2 transition ${selected === 'stripe'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'bg-white border-gray-300 hover:border-gray-400'
                        }`}
                    onClick={() => onSelect('stripe')}
                >
                    <div className="font-semibold">Stripe</div>
                    <div className="text-xs text-gray-500">Credit/Debit Card</div>
                </button>

                <button
                    className={`px-4 py-3 rounded-lg border-2 transition ${selected === 'paypal'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'bg-white border-gray-300 hover:border-gray-400'
                        }`}
                    onClick={() => onSelect('paypal')}
                >
                    <div className="font-semibold">PayPal</div>
                    <div className="text-xs text-gray-500">PayPal Account</div>
                </button>

                <button
                    className={`px-4 py-3 rounded-lg border-2 transition ${selected === 'escrow'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'bg-white border-gray-300 hover:border-gray-400'
                        }`}
                    onClick={() => onSelect('escrow')}
                >
                    <div className="font-semibold">Escrow</div>
                    <div className="text-xs text-gray-500">Secure Escrow</div>
                </button>

                {/* Bangladesh Mobile Financial Services */}
                <button
                    className={`px-4 py-3 rounded-lg border-2 transition ${selected === 'bkash'
                        ? 'bg-pink-50 border-pink-600 text-pink-700'
                        : 'bg-white border-gray-300 hover:border-gray-400'
                        }`}
                    onClick={() => onSelect('bkash')}
                >
                    <div className="font-semibold text-pink-600">bKash</div>
                    <div className="text-xs text-gray-500">Mobile Money</div>
                </button>

                <button
                    className={`px-4 py-3 rounded-lg border-2 transition ${selected === 'rocket'
                        ? 'bg-purple-50 border-purple-600 text-purple-700'
                        : 'bg-white border-gray-300 hover:border-gray-400'
                        }`}
                    onClick={() => onSelect('rocket')}
                >
                    <div className="font-semibold text-purple-600">Rocket</div>
                    <div className="text-xs text-gray-500">DBBL Mobile Money</div>
                </button>

                <button
                    className={`px-4 py-3 rounded-lg border-2 transition ${selected === 'nagad'
                        ? 'bg-orange-50 border-orange-600 text-orange-700'
                        : 'bg-white border-gray-300 hover:border-gray-400'
                        }`}
                    onClick={() => onSelect('nagad')}
                >
                    <div className="font-semibold text-orange-600">Nagad</div>
                    <div className="text-xs text-gray-500">Post Office Mobile</div>
                </button>
            </div>
            {selected === 'stripe' && (
                <div className="mt-4">
                    <StripeCheckoutButton orderId="order123" amount={0} onSuccess={() => { }} />
                </div>
            )}
        </div>
    );
}
