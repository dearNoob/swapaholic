// src/components/onboarding/GuidedTour.tsx
'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal'; // Assuming a generic Modal component exists

const steps = [
    { title: 'Dashboard Overview', content: 'Get to know the main dashboard and navigation.' },
    { title: 'Browsing Products', content: 'Learn how to search, filter, and view product details.' },
    { title: 'Bidding & Buying', content: 'Understand the bidding process and how to place a bid.' },
    { title: 'Selling Items', content: 'Discover how to list a product and manage your listings.' },
];

export default function GuidedTour() {
    const [open, setOpen] = useState(true);
    const [current, setCurrent] = useState(0);

    const next = () => {
        if (current < steps.length - 1) setCurrent(current + 1);
        else setOpen(false);
    };
    const prev = () => {
        if (current > 0) setCurrent(current - 1);
    };

    return (
        <Modal isOpen={open} onClose={() => setOpen(false)} title={steps[current].title}>
            <p className="mb-4">{steps[current].content}</p>
            <div className="flex justify-between">
                <button
                    onClick={prev}
                    disabled={current === 0}
                    className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
                >
                    Back
                </button>
                <button
                    onClick={next}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                    {current === steps.length - 1 ? 'Finish' : 'Next'}
                </button>
            </div>
        </Modal>
    );
}
