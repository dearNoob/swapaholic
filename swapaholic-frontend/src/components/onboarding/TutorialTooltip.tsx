// src/components/onboarding/TutorialTooltip.tsx
'use client';

import React, { useState } from 'react';
import { FaInfoCircle } from 'react-icons/fa';

interface Props {
    message: string;
    children?: React.ReactNode;
}

export default function TutorialTooltip({ message, children }: Props) {
    const [visible, setVisible] = useState(false);

    return (
        <div className="relative inline-block" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
            {children}
            <FaInfoCircle className="inline-block ml-1 text-gray-500 cursor-pointer" />
            {visible && (
                <div className="absolute z-10 w-64 p-2 bg-white border rounded shadow-lg left-0 mt-2">
                    <p className="text-sm text-gray-800">{message}</p>
                </div>
            )}
        </div>
    );
}
