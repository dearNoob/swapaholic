import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaGavel, FaExternalLinkAlt, FaUser } from 'react-icons/fa';
import { sellerApi } from '../../api/seller';
import Link from 'next/link';

interface Bid {
    id: string;
    amount: number;
    time: string;
    status: string;
    product: {
        id: string;
        title: string;
        image: string;
    };
    bidder: {
        id: string;
        name: string;
        image: string;
    };
}

export const SellerBids = () => {
    const [bids, setBids] = useState<Bid[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchBids = async (currentPage: number) => {
        try {
            setIsLoading(true);
            const data = await sellerApi.getAllBids(currentPage, 15);
            setBids(data.bids || []);
            if (data.pagination) {
                setTotalPages(data.pagination.pages);
            }
        } catch (error) {
            console.error('Error fetching bids:', error);
            toast.error('Failed to load bids');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBids(page);
    }, [page]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'won': return 'bg-indigo-100 text-indigo-800';
            case 'lost': return 'bg-gray-100 text-gray-800';
            case 'retracted': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="md:flex md:items-center md:justify-between mb-8">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                            All Bids Received
                        </h2>
                        <p className="mt-1 text-lg text-gray-500">
                            Monitor the bidding activity on your listings.
                        </p>
                    </div>
                </div>

                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                            <p className="mt-2 text-gray-500">Loading bids...</p>
                        </div>
                    ) : bids.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg shadow">
                            <FaGavel className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-lg font-medium text-gray-900">No Bids Yet</h3>
                            <p className="mt-1 text-gray-500">
                                You haven't received any bids on your products yet.
                            </p>
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {bids.map((bid) => (
                                <li key={bid.id}>
                                    <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition duration-150">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="flex-shrink-0 h-16 w-16">
                                                    <img
                                                        className="h-16 w-16 rounded-md object-cover border border-gray-200"
                                                        src={bid.product.image}
                                                        alt={bid.product.title}
                                                    />
                                                </div>
                                                <div>
                                                    <Link href={`/products/${bid.product.id}`} className="text-lg font-medium text-indigo-600 hover:text-indigo-900 truncate">
                                                        {bid.product.title}
                                                    </Link>
                                                    <div className="mt-1 flex items-center text-sm text-gray-500 gap-2">
                                                        <FaUser className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                                        <span>{bid.bidder.name}</span>
                                                        <span>&bull;</span>
                                                        <span>{new Date(bid.time).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className="text-lg font-bold text-gray-900">
                                                    ৳{bid.amount.toFixed(2)}
                                                </span>
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full uppercase ${getStatusBadge(bid.status)}`}>
                                                    {bid.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    
                    {/* Pagination */}
                    {!isLoading && totalPages > 1 && (
                        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                            <div className="flex-1 flex justify-between sm:hidden">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${page === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 ${page === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    Next
                                </button>
                            </div>
                            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-sm text-gray-700">
                                        Showing page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span>
                                    </p>
                                </div>
                                <div>
                                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${page === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <span className="sr-only">Previous</span>
                                            {/* Left chevron icon would go here but text is fine */}
                                            Previous
                                        </button>
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 ${page === totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <span className="sr-only">Next</span>
                                            {/* Right chevron icon would go here but text is fine */}
                                            Next
                                        </button>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
