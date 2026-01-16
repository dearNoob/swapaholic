// src/components/onboarding/ProfileCompletionPrompt.tsx
'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal'; // Assuming a generic Modal component exists

export default function ProfileCompletionPrompt() {
    const [open, setOpen] = useState(true);

    const handleComplete = () => {
        // Placeholder: could navigate to profile page or mark as completed
        setOpen(false);
    };

    return (
        <Modal isOpen={open} onClose={() => setOpen(false)} title="Complete Your Profile">
            <p className="mb-4">
                To get the best experience, please fill out your profile information (name, address, preferences).
            </p>
            <div className="flex justify-end space-x-2">
                <button
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 bg-gray-300 rounded"
                >
                    Later
                </button>
                <button
                    onClick={handleComplete}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                    Complete Now
                </button>
            </div>
        </Modal>
    );
}
