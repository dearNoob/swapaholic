'use client';

import React from 'react';
import Header from './Header';
import Footer from '../Footer';
import { usePathname } from 'next/navigation';

interface MainLayoutProps {
    children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
    const pathname = usePathname();

    // Hide global header/footer for logistics, delivery, and admin dashboards
    const hideHeader = pathname.startsWith('/logistics') || pathname.startsWith('/delivery') || pathname.startsWith('/admin');
    const hideFooter = hideHeader || pathname === '/login' || pathname === '/register' || pathname.startsWith('/onboarding');

    return (
        <div className="min-h-screen bg-transparent text-[var(--foreground)] flex flex-col">
            {!hideHeader && <Header />}
            <main className={`flex-1 ${!hideHeader ? 'pb-8' : ''}`}>
                {children}
            </main>
            {!hideFooter && <Footer />}
        </div>
    );
}

