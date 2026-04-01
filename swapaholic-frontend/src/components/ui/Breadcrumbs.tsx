'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FaChevronRight, FaHome } from 'react-icons/fa';

interface BreadcrumbOverride {
    [key: string]: string;
}

// Friendly labels for known route segments
const ROUTE_LABELS: BreadcrumbOverride = {
    'buyer': 'Buyer',
    'seller': 'Seller',
    'admin': 'Admin',
    'dashboard': 'Dashboard',
    'products': 'Products',
    'orders': 'Orders',
    'disputes': 'Disputes',
    'analytics': 'Analytics',
    'profile': 'Profile',
    'settings': 'Settings',
    'create-listing': 'Create Listing',
    'my-bids': 'My Bids',
    'my-reviews': 'My Reviews',
    'messages': 'Messages',
    'notifications': 'Notifications',
    'browse': 'Browse',
    'about': 'About',
    'contact': 'Contact',
    'how-it-works': 'How It Works',
    'verification': 'Verification',
    'logistics-officers': 'Logistics Officers',
    'reports': 'Reports',
    'content': 'Content',
    'payment': 'Payment',
    'payments': 'Payments',
    'password-reset': 'Password Reset',
};

interface BreadcrumbsProps {
    /** Override the auto-generated label for the last breadcrumb */
    currentLabel?: string;
    /** Additional custom crumbs to override auto-generation */
    overrides?: BreadcrumbOverride;
    /** Custom className for the container */
    className?: string;
}

export default function Breadcrumbs({ currentLabel, overrides = {}, className = '' }: BreadcrumbsProps) {
    const pathname = usePathname();

    const segments = pathname.split('/').filter(Boolean);

    // Don't show breadcrumbs on the home page
    if (segments.length === 0) return null;

    const allLabels = { ...ROUTE_LABELS, ...overrides };

    const crumbs = segments.map((segment, index) => {
        const path = '/' + segments.slice(0, index + 1).join('/');
        const isLast = index === segments.length - 1;

        // Use currentLabel override for the last crumb
        let label = isLast && currentLabel
            ? currentLabel
            : allLabels[segment] || segment
                .replace(/-/g, ' ')
                .replace(/\b\w/g, (c) => c.toUpperCase());

        // Skip UUID-like segments with a readable name
        if (/^[0-9a-f]{8,}$/i.test(segment)) {
            label = 'Details';
        }

        return { path, label, isLast };
    });

    return (
        <nav aria-label="Breadcrumb" className={`flex items-center text-sm text-gray-500 ${className}`}>
            <Link
                href="/"
                className="flex items-center hover:text-indigo-600 transition-colors"
            >
                <FaHome className="w-3.5 h-3.5" />
            </Link>

            {crumbs.map((crumb) => (
                <span key={crumb.path} className="flex items-center">
                    <FaChevronRight className="w-2.5 h-2.5 mx-2 text-gray-300" />
                    {crumb.isLast ? (
                        <span className="font-medium text-gray-900 truncate max-w-[200px]">
                            {crumb.label}
                        </span>
                    ) : (
                        <Link
                            href={crumb.path}
                            className="hover:text-indigo-600 transition-colors truncate max-w-[200px]"
                        >
                            {crumb.label}
                        </Link>
                    )}
                </span>
            ))}
        </nav>
    );
}
