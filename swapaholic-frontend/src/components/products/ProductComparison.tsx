'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaTimes, FaGavel, FaClock, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

interface Product {
    id: string;
    title: string;
    image: string;
    currentBid: number;
    endTime: string;
    bids: number;
    condition: string;
    category: string;
}

interface ProductComparisonProps {
    productIds: string[];
    products: Product[];
    onClose: () => void;
    onRemove: (id: string) => void;
}

export default function ProductComparison({ productIds, products, onClose, onRemove }: ProductComparisonProps) {
    const comparisonAttributes = [
        { key: 'currentBid', label: 'Current Bid', format: (v: any) => `৳${v}` },
        { key: 'bids', label: 'Total Bids', format: (v: any) => v },
        { key: 'category', label: 'Category', format: (v: any) => v },
        { key: 'condition', label: 'Condition', format: (v: any) => v },
        {
            key: 'endTime', label: 'Time Remaining', format: (v: any) => {
                const diff = new Date(v).getTime() - Date.now();
                const hours = Math.floor(diff / 3600000);
                const days = Math.floor(hours / 24);
                if (days > 0) return `${days} days`;
                if (hours > 0) return `${hours} hours`;
                return 'Ending soon';
            }
        },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Product Comparison ({products.length})
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 p-2"
                    >
                        <FaTimes className="text-2xl" />
                    </button>
                </div>

                {/* Comparison Table */}
                <div className="flex-1 overflow-auto p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="p-4 text-left bg-gray-50 sticky left-0 z-10 border-r">
                                        <span className="font-semibold text-gray-700">Feature</span>
                                    </th>
                                    {products.map((product) => (
                                        <th key={product.id} className="p-4 bg-gray-50 min-w-[250px]">
                                            <div className="relative">
                                                <button
                                                    onClick={() => onRemove(product.id)}
                                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                                                    title="Remove from comparison"
                                                >
                                                    <FaTimes className="text-xs" />
                                                </button>
                                                {/* Product Image */}
                                                <div className="relative h-32 mb-3 rounded-lg overflow-hidden">
                                                    <Image
                                                        src={product.image}
                                                        alt={product.title}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                                {/* Product Title */}
                                                <Link
                                                    href={`/products/${product.id}`}
                                                    className="font-semibold text-gray-900 hover:text-indigo-600 transition line-clamp-2"
                                                >
                                                    {product.title}
                                                </Link>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {comparisonAttributes.map((attr, index) => (
                                    <tr
                                        key={attr.key}
                                        className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                                    >
                                        <td className="p-4 font-medium text-gray-700 sticky left-0 bg-inherit border-r">
                                            {attr.label}
                                        </td>
                                        {products.map((product) => {
                                            const value = (product as any)[attr.key];
                                            const isHighest = attr.key === 'currentBid' &&
                                                value === Math.max(...products.map(p => p.currentBid));
                                            const isMostBids = attr.key === 'bids' &&
                                                value === Math.max(...products.map(p => p.bids));

                                            return (
                                                <td
                                                    key={product.id}
                                                    className={`p-4 text-center ${(isHighest || isMostBids) ? 'bg-green-50 font-bold text-green-700' : ''
                                                        }`}
                                                >
                                                    <div className="flex items-center justify-center gap-2">
                                                        {attr.format(value)}
                                                        {(isHighest || isMostBids) && (
                                                            <FaCheckCircle className="text-green-600" />
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t bg-gray-50">
                    <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-600">
                            💡 Green highlights indicate the best value in each category
                        </p>
                        <button
                            onClick={onClose}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                        >
                            Close Comparison
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
