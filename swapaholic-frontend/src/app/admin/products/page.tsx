'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaCheckCircle, FaTimes, FaEye } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { adminApi } from '../../../api/admin';
import { useRequireAdminAuth } from '../../../hooks/useRequireAdminAuth';

export default function ProductModerationPage() {
    const [products, setProducts] = useState<any[]>([]);
    // Protect route with admin auth
    const { isLoading: isAuthLoading, isAdmin } = useRequireAdminAuth();
    const [isDataLoading, setIsDataLoading] = useState(true);

    // Combined loading state
    const isLoading = isAuthLoading || isDataLoading;

    useEffect(() => {
        if (isAdmin) {
            fetchPendingProducts();
        }
    }, [isAdmin]);

    const fetchPendingProducts = async () => {
        try {
            setIsDataLoading(true);
            const data = await adminApi.getPendingProducts();
            setProducts(data.products || []);
        } catch (err) {
            console.error('Error fetching pending products:', err);
            // Mock data
            setProducts(Array.from({ length: 10 }, (_, i) => ({
                id: `prod-${i + 1}`,
                title: `Product ${i + 1}`,
                image: '/placeholder-product.jpg',
                seller: `Seller ${i + 1}`,
                category: ['Electronics', 'Fashion', 'Home'][Math.floor(Math.random() * 3)],
                startingBid: Math.floor(Math.random() * 500) + 100,
                description: 'Product description goes here...',
                createdAt: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
            })));
        } finally {
            setIsDataLoading(false);
        }
    };

    const handleApprove = async (productId: string) => {
        try {
            await adminApi.approveProduct(productId);
            toast.success('Product approved successfully');
            fetchPendingProducts();
        } catch (err) {
            toast.error('Failed to approve product');
        }
    };

    const handleReject = async (productId: string) => {
        const reason = prompt('Reason for rejection:');
        if (reason) {
            try {
                await adminApi.rejectProduct(productId, reason);
                toast.success('Product rejected');
                fetchPendingProducts();
            } catch (err) {
                toast.error('Failed to reject product');
            }
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                        Product Moderation 📦
                    </h1>
                    <p className="text-lg text-gray-600">
                        Review and approve pending product listings
                    </p>
                </div>

                {/* Products List */}
                {isLoading ? (
                    <div className="text-center py-16">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
                        <p className="text-gray-600">Loading pending products...</p>
                    </div>
                ) : products.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <FaCheckCircle className="mx-auto text-6xl text-green-500 mb-4" />
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">All Caught Up!</h3>
                        <p className="text-gray-600">No pending products to review</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {products.map((product) => (
                            <div
                                key={product.id}
                                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition"
                            >
                                <div className="flex gap-6">
                                    {/* Product Image */}
                                    <div className="relative w-48 h-48 rounded-lg overflow-hidden flex-shrink-0">
                                        <Image
                                            src={product.image}
                                            alt={product.title}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold text-gray-900 mb-2">
                                                    {product.title}
                                                </h3>

                                                <div className="flex items-center gap-4 mb-3 text-sm">
                                                    <span className="text-gray-600">
                                                        Seller: <strong>{product.seller}</strong>
                                                    </span>
                                                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                                                        {product.category}
                                                    </span>
                                                    <span className="text-gray-500">
                                                        {new Date(product.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>

                                                <p className="text-gray-700 mb-4 line-clamp-3">
                                                    {product.description}
                                                </p>

                                                <div className="mb-4">
                                                    <span className="text-sm text-gray-600">Starting Bid: </span>
                                                    <span className="text-2xl font-bold text-green-600">
                                                        ${product.startingBid}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-3">
                                            <Link href={`/products/${product.id}`}>
                                                <button className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">
                                                    <FaEye /> View Details
                                                </button>
                                            </Link>
                                            <button
                                                onClick={() => handleApprove(product.id)}
                                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                                            >
                                                <FaCheckCircle /> Approve
                                            </button>
                                            <button
                                                onClick={() => handleReject(product.id)}
                                                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                                            >
                                                <FaTimes /> Reject
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
