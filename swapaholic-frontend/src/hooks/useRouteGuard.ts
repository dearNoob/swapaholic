'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAppSelector } from '../store/hooks';

// Routes that anyone can access
const PUBLIC_ROUTES = [
    '/login', '/register', '/forgot-password', '/reset-password', 
    '/verify-email', '/about', '/contact', '/legal', '/about/cookie', 
    '/legal/terms', '/legal/privacy'
];

export const useRouteGuard = () => {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isAuthenticated, isLoading } = useAppSelector((state: any) => state.auth);

    useEffect(() => {
        // Wait for auth to initialize before redirecting anywhere
        if (isLoading) return;

        const isPublicPath = PUBLIC_ROUTES.some(p => pathname === p || pathname.startsWith(p + '/'));

        if (!isAuthenticated) {
            // Not logged in. Let them browse public pages / products.
            // Strict private routes like dashboard/profile should kick them out to login.
            // Exception: staff login pages must remain accessible without auth.
            const isStaffLoginPage = pathname === '/admin/login' || pathname === '/logistics/login';
            if (!isStaffLoginPage) {
                if (pathname.includes('/admin')) {
                    router.replace('/admin/login');
                } else if (pathname.includes('/logistics')) {
                    router.replace('/logistics/login');
                } else if (pathname.includes('/dashboard') || pathname.includes('/profile') || pathname.includes('/messages') || pathname.includes('/settings')) {
                    router.replace('/login');
                }
            }
            return;
        }

        const role = user?.role;
        if (!role) return;

        // STAFF ROLES: Admin, Logistics
        // They must stay inside their own namespaces and cannot access marketplace.
        if (role === 'admin' || role === 'logistics_officer') {
            let allowedPrefix = '';
            if (role === 'admin') allowedPrefix = '/admin';
            if (role === 'logistics_officer') allowedPrefix = '/logistics';

            // Exception: Public pages like /legal can be viewed by anyone.
            if (!pathname.startsWith(allowedPrefix) && !isPublicPath) {
                // If they try to access /, /browse, /profile, redirect to their dashboard
                router.replace(`${allowedPrefix}/dashboard`);
                return;
            }
        } 
        // MARKETPLACE ROLES: Buyer, Seller
        // They cannot access staff namespaces.
        else if (role === 'buyer' || role === 'seller') {
            if (
                pathname.startsWith('/admin') || 
                pathname.startsWith('/logistics')
            ) {
                router.replace('/dashboard');
                return;
            }
        }

    }, [pathname, isAuthenticated, isLoading, user, router]);
};
