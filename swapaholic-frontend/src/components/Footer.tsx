'use client';

import Link from 'next/link';
import { FaGithub, FaTwitter, FaLinkedin, FaEnvelope } from 'react-icons/fa';

export default function Footer() {
    return (
        <footer className="w-full bg-gray-900 dark:bg-black text-gray-300 border-t border-gray-800">
            <div className="mx-auto max-w-6xl px-8 py-12">
                <div className="grid gap-8 md:grid-cols-4">
                    {/* About Section */}
                    <div>
                        <h3 className="mb-4 text-xl font-bold text-white">Swapaholic</h3>
                        <p className="text-sm">
                            Your trusted marketplace for buying and selling second-hand items
                            with secure escrow and quality verification.
                        </p>
                    </div>

                    {/* Features */}
                    <div>
                        <h4 className="mb-4 font-semibold text-white">Features</h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/products" className="hover:text-indigo-400">
                                    Browse Products
                                </Link>
                            </li>
                            <li>
                                <Link href="/seller/create-listing" className="hover:text-indigo-400">
                                    Sell Items
                                </Link>
                            </li>
                            <li>
                                <Link href="/dashboard" className="hover:text-indigo-400">
                                    Live Bidding
                                </Link>
                            </li>
                            <li>
                                <Link href="/payment" className="hover:text-indigo-400">
                                    Secure Payments
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="mb-4 font-semibold text-white">Legal</h4>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link href="/about" className="hover:text-indigo-400 transition-colors">
                                    About Us
                                </Link>
                            </li>
                            <li>
                                <Link href="/legal/terms" className="hover:text-indigo-400 transition-colors">
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link href="/legal/privacy" className="hover:text-indigo-400 transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/about/contact" className="hover:text-indigo-400 transition-colors">
                                    Support
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="mb-4 font-semibold text-white">Connect</h4>
                        <div className="flex gap-4 text-2xl">
                            <a
                                href="mailto:support@swapaholic.com"
                                className="hover:text-indigo-400 transition-colors"
                                aria-label="Email"
                            >
                                <FaEnvelope />
                            </a>
                        </div>
                        <p className="mt-4 text-sm font-medium text-gray-200">support@swapaholic.com</p>
                        <p className="mt-2 text-xs text-gray-400">Dhaka, Bangladesh</p>

                    </div>
                </div>

                <div className="mt-8 border-t border-gray-700 pt-8 text-center text-sm">
                    <p>
                        © {new Date().getFullYear()} Swapaholic. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
