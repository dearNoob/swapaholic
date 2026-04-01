'use client';

import { usePathname } from 'next/navigation';
import LogisticsSidebar from '../../components/logistics/LogisticsSidebar';

export default function LogisticsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/logistics/login';

    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900/30">
            <LogisticsSidebar />
            {/* Main content with left margin matching sidebar width (w-64 = 16rem) */}
            <main className="flex-1 lg:ml-64 min-h-screen transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
