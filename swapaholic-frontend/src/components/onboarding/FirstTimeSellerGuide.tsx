// src/components/onboarding/FirstTimeSellerGuide.tsx
'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal'; // Assuming a generic Modal component exists

const steps = [
    { title: 'Set Up Your Store', content: 'Add your store name, logo, and description to attract buyers.' },
    { title: 'Create Your First Listing', content: 'Upload photos, set a starting price, and define auction duration.' },
    { title: 'Manage Orders', content: 'Track orders, communicate with buyers, and handle shipping.' },
    { title: 'Earn Reputation', content: 'Collect positive reviews and build trust in the community.' },
];

export default function FirstTimeSellerGuide() {
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
