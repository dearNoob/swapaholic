// src/app/maintenance/page.tsx
import Link from 'next/link';
import React from 'react';

export default function MaintenancePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-200 p-4">
            <h1 className="text-4xl font-bold text-yellow-800 mb-4">Maintenance Mode</h1>
            <p className="text-lg mb-6">We are currently performing scheduled maintenance. The site will be back online shortly.</p>
            <Link href="/" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                Return to Home
            </Link>
        </div>
    );
}
