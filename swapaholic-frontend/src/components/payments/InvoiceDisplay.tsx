// src/components/payments/InvoiceDisplay.tsx
import React, { useEffect, useState } from 'react';
import { paymentsApi } from '@/api/payments';

interface Props {
    paymentId?: string;
}

export default function InvoiceDisplay({ paymentId }: Props) {
    const [invoiceUrl, setInvoiceUrl] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    useEffect(() => {
        if (!paymentId) return;
        const fetchInvoice = async () => {
            setLoading(true);
            try {
                const blob = await paymentsApi.generateInvoice(paymentId);
                const url = window.URL.createObjectURL(blob);
                setInvoiceUrl(url);
            } catch (e) {
                setError('Failed to load invoice');
            }
            setLoading(false);
        };
        fetchInvoice();
    }, [paymentId]);

    if (!paymentId) return null;

    return (
        <div className="border p-4 rounded-md mt-4">
            <h3 className="font-semibold mb-2">Invoice / Receipt</h3>
            {loading && <p>Loading invoice...</p>}
            {error && <p className="text-red-600">{error}</p>}
            {invoiceUrl && (
                <a
                    href={invoiceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                >
                    View Invoice
                </a>
            )}
        </div>
    );
}
