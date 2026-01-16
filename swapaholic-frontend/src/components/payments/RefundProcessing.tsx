// src/components/payments/RefundProcessing.tsx
import React, { useState } from 'react';
import { paymentApi } from '@/api/payment';

interface Props {
    paymentId?: string; // optional, may be undefined until payment is created
}

export default function RefundProcessing({ paymentId }: Props) {
    const [amount, setAmount] = useState<number>(0);
    const [reason, setReason] = useState<string>('');
    const [status, setStatus] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);

    const handleRefund = async () => {
        if (!paymentId) {
            setStatus('No payment to refund');
            return;
        }
        setLoading(true);
        try {
            await paymentApi.refund(paymentId, reason);
            setStatus('Refund processed successfully');
        } catch (e) {
            setStatus('Refund failed');
        }
        setLoading(false);
    };

    return (
        <div className="border p-4 rounded-md mt-4">
            <h3 className="font-semibold mb-2">Refund Processing</h3>
            <div className="flex flex-col space-y-2">
                <input
                    type="number"
                    placeholder="Refund amount"
                    value={amount}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    className="border rounded px-2 py-1"
                />
                <input
                    type="text"
                    placeholder="Reason (optional)"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="border rounded px-2 py-1"
                />
                <button
                    className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50"
                    onClick={handleRefund}
                    disabled={loading}
                >
                    Process Refund
                </button>
                {status && <p className="text-sm mt-2">{status}</p>}
            </div>
        </div>
    );
}
