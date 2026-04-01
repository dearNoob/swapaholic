import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Browse Products | Swapaholic',
    description: 'Browse and bid on second-hand products. Find electronics, fashion, home goods, and more at great prices on Swapaholic.',
};

export default function BrowseLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
