// src/app/not-found.tsx
import Link from 'next/link';
import React from 'react';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
            <h1 className="text-5xl font-bold text-red-600 mb-4">404</h1>
            <p className="text-xl mb-6">Oops! The page you are looking for does not exist.</p>
            <Link href="/" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                Go Home
            </Link>
        </div>
    );
}
