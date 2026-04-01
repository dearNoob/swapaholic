'use client';

import React from 'react';

interface PasswordStrengthMeterProps {
    password: string;
}

const getStrength = (password: string) => {
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
};

const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500'];

export default function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
    if (!password) return null;

    const strength = getStrength(password);
    const label = strengthLabels[strength - 1] || 'Very Weak';
    const color = strengthColors[strength - 1] || 'bg-red-500';

    return (
        <div className="mt-1.5">
            <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i <= strength ? color : 'bg-gray-200'
                        }`}
                    />
                ))}
            </div>
            <p className={`text-xs font-semibold ${
                strength <= 2 
                    ? 'text-red-600 dark:text-red-400' 
                    : strength <= 3 
                        ? 'text-yellow-700 dark:text-yellow-400' 
                        : 'text-green-700 dark:text-green-400'
            }`}>
                {label}
            </p>

        </div>
    );
}
