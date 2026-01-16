'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaEdit, FaEye, FaTrash, FaGavel, FaCheckCircle, FaClock, FaBan, FaBox } from 'react-icons/fa';

interface Listing {
    id: string;
    title: string;
    image: string;
    price: number;
    views: number;
    bids: number;
    status: 'active' | 'pending' | 'sold' | 'ended';
    createdAt: string;
}

interface ActiveListingsProps {
    listings: Listing[];
}

export default function ActiveListings({ listings }: ActiveListingsProps) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return { text: 'Active', class: 'bg-green-100 text-green-800', icon: FaCheckCircle };
            case 'pending':
                return { text: 'Pending', class: 'bg-yellow-100 text-yellow-800', icon: FaClock };
            case 'sold':
                return { text: 'Sold', class: 'bg-blue-100 text-blue-800', icon: FaGavel };
            case 'ended':
                return { text: 'Ended', class: 'bg-gray-100 text-gray-800', icon: FaBan };
            default:
                return { text: status, class: 'bg-gray-100 text-gray-800', icon: FaClock };
        }
    };

    if (listings.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-12">
                <div className="text-center">
                    <FaBox className="mx-auto text-6xl text-gray-300 mb-4" />
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">No Active Listings</h3>
                    <p className="text-gray-600 mb-6">Start selling by creating your first product listing</p>
                    <Link
                        href="/seller/create-listing"
                        className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
                    >
                        Create First Listing
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Active Listings ({listings.length})</h2>
                <Link
                    href="/seller/create-listing"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium text-sm"
                >
                    + New Listing
                </Link>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-gray-200">
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Product</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Price</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Views</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Bids</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                            <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {listings.map((listing) => {
                            const statusBadge = getStatusBadge(listing.status);
                            const StatusIcon = statusBadge.icon;

                            return (
                                <tr key={listing.id} className="border-b border-gray-100 hover:bg-gray-50 transition">
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                                                <Image src={listing.image} alt={listing.title} fill className="object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                                <Link href={`/products/${listing.id}`} className="font-semibold text-gray-900 hover:text-indigo-600 transition block truncate">
                                                    {listing.title}
                                                </Link>
                                                <p className="text-xs text-gray-500">
                                                    Listed {new Date(listing.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className="font-semibold text-gray-900">৳{listing.price}</span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-1 text-gray-600">
                                            <FaEye className="text-sm" />
                                            <span>{listing.views}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-1 text-gray-600">
                                            <FaGavel className="text-sm" />
                                            <span>{listing.bids}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4">
                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${statusBadge.class}`}>
                                            <StatusIcon />
                                            {statusBadge.text}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                title="Edit"
                                            >
                                                <FaEdit />
                                            </button>
                                            <Link
                                                href={`/products/${listing.id}`}
                                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                                title="View"
                                            >
                                                <FaEye />
                                            </Link>
                                            <button
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                                title="Delete"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
