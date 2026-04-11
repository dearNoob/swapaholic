// src/app/about/how-it-works/page.tsx
import React from 'react';

export default function HowItWorksPage() {
    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-4">How It Works</h1>
            <ol className="list-decimal pl-5 space-y-3">
                <li>
                    <strong>Browse & Discover:</strong> Explore products on the marketplace using advanced search and filters.
                </li>
                <li>
                    <strong>Place Bids:</strong> Participate in auctions by placing bids. Real-time updates keep you informed.
                </li>
                <li>
                    <strong>Win & Pay:</strong> When you win, complete payment via Stripe, PayPal, or local Bangladeshi gateways (bKash, Nagad) with escrow protection.
                </li>
                <li>
                    <strong>Shipping & Delivery:</strong> Sellers ship the item, and you can track the order from the &quot;My Orders&quot; page.
                </li>
                <li>
                    <strong>Leave Feedback:</strong> Rate the transaction and leave reviews to help the community.
                </li>
            </ol>
            <p className="mt-4 text-sm text-gray-600">Last updated: 2025-11-25</p>
        </div>
    );
}
