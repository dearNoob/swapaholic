// src/components/onboarding/WelcomeWizard.tsx
'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal'; // Assume a generic Modal component exists

const steps = [
    { title: 'Welcome to Swapaholic', content: 'Discover a vibrant marketplace for buying and selling.' },
    { title: 'Create Your Account', content: 'Set up your profile to start bidding or listing items.' },
    { title: 'Explore Features', content: 'Use the guided tour to learn how to navigate the platform.' },
];

export default function WelcomeWizard() {
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
