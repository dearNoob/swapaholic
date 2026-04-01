'use client';

import { usePathname } from 'next/navigation';
import AdminSidebar from '../../components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLoginPage = pathname === '/admin/login';

    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            <AdminSidebar />
            {/* Main content with left margin matching sidebar width (w-64 = 16rem) */}
            <main className="flex-1 lg:ml-64 min-h-screen transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
