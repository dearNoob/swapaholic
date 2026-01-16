// src/components/payments/PayPalButton.tsx
import React from 'react';

interface Props {
    onPay: () => void;
}

export default function PayPalButton({ onPay }: Props) {
    return (
        <button
            className="w-full bg-yellow-500 text-white py-2 rounded hover:bg-yellow-600 transition"
            onClick={onPay}
        >
            Pay with PayPal
        </button>
    );
}
