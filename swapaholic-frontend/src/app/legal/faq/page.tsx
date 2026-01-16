// src/app/legal/faq/page.tsx
import React from 'react';

export default function FAQPage() {
    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-4">Frequently Asked Questions</h1>
            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">General</h2>
                <ul className="list-disc pl-5 space-y-2">
                    <li>
                        <strong>What is Swapaholic?</strong> Swapaholic is an online marketplace for buying and selling goods through auctions.
                    </li>
                    <li>
                        <strong>How do I create an account?</strong> Click "Sign Up" on the homepage and fill in the required details.
                    </li>
                </ul>
            </section>
            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Payments</h2>
                <ul className="list-disc pl-5 space-y-2">
                    <li>
                        <strong>Which payment methods are supported?</strong> We support Stripe, PayPal, and local Bangladeshi gateways (bKash, Nagad) via escrow.
                    </li>
                    <li>
                        <strong>Can I get a refund?</strong> See our Refund Policy for details on eligibility and process.
                    </li>
                </ul>
            </section>
            <section className="mb-6">
                <h2 className="text-xl font-semibold mb-2">Shipping</h2>
                <ul className="list-disc pl-5 space-y-2">
                    <li>
                        <strong>How is shipping calculated?</strong> Shipping costs are calculated based on weight, destination, and selected carrier.
                    </li>
                    <li>
                        <strong>Can I track my order?</strong> Yes, you can track shipments from the "My Orders" page.
                    </li>
                </ul>
            </section>
        </div>
    );
}
