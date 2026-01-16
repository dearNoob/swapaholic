// src/components/payments/EscrowManagement.tsx
import React, { useState } from 'react';
import { paymentApi } from '@/api/payment';

interface Props {
    orderId: string;
    amount: number;
}

export default function EscrowManagement({ orderId, amount }: Props) {
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const initiate = async () => {
        setLoading(true);
        try {
            const payment = await paymentApi.initiateEscrow(orderId, amount);
            setStatus('Escrow initiated');
        } catch (e) {
            setStatus('Failed to initiate escrow');
        }
        setLoading(false);
    };

    const release = async () => {
        setLoading(true);
        try {
            await paymentApi.releaseEscrow(orderId);
            setStatus('Escrow released');
        } catch (e) {
            setStatus('Failed to release escrow');
        }
        setLoading(false);
    };

    const refund = async () => {
        setLoading(true);
        try {
            await paymentApi.refundEscrow(orderId);
            setStatus('Escrow refunded');
        } catch (e) {
            setStatus('Failed to refund escrow');
        }
        setLoading(false);
    };

    return (
        <div className="border p-4 rounded-md">
            <h3 className="font-semibold mb-2">Escrow Management</h3>
            <p>Order ID: {orderId}</p>
            <p>Amount: {amount}</p>
            <div className="flex space-x-2 mt-2">
                <button
                    className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50"
                    onClick={initiate}
                    disabled={loading}
                >
                    Initiate Escrow
                </button>
                <button
                    className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                    onClick={release}
                    disabled={loading}
                >
                    Release Escrow
                </button>
                <button
                    className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50"
                    onClick={refund}
                    disabled={loading}
                >
                    Refund Escrow
                </button>
            </div>
            {status && <p className="mt-2 text-sm">{status}</p>}
        </div>
    );
}
