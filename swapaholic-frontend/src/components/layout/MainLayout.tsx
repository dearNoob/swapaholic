'use client';

import React from 'react';
import Header from './Header';

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="pb-8">
                {children}
            </main>
        </div>
    );
}
