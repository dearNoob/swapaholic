// src/app/error.tsx
'use client';

import Link from 'next/link';
import React from 'react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <h1 className="text-5xl font-bold text-red-600 mb-4">500</h1>
            <p className="text-xl mb-6">Something went wrong. Please try again later.</p>
            <button
                onClick={() => reset()}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition mb-4"
            >
                Retry
            </button>
            <Link href="/" className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition">
                Go Home
            </Link>
        </div>
    );
}
