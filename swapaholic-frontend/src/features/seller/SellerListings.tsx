import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { FaEdit, FaTrash, FaEye, FaPlus, FaSearch, FaFilter } from 'react-icons/fa';
import { sellerApi } from '../../api/seller';
import { productsApi } from '../../api/products';
import { Button } from '../../components/ui/Button';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

interface Listing {
    id: string;
    title: string;
    price: number;
    category: string;
    condition: string;
    status: 'active' | 'sold' | 'expired';
    views: number;
    bids: number;
    createdAt: string;
    images: string[];
}

export const SellerListings = () => {
    const [listings, setListings] = useState<Listing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    // Modal state
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [listingToDelete, setListingToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchListings = async () => {
        try {
            setIsLoading(true);
            const data = await sellerApi.getListings();
            const listingsData = Array.isArray(data) ? data : (data.listings || []);
            setListings(listingsData);
        } catch (error) {
            console.error('Error fetching listings:', error);
            toast.error('Failed to load listings');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchListings();
    }, []);

    const handleDeleteClick = (id: string) => {
        setListingToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!listingToDelete) return;

        try {
            setIsDeleting(true);
            await productsApi.deleteProduct(listingToDelete);
            toast.success('Listing deleted successfully');
            fetchListings(); // Refresh list
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error('Error deleting listing:', error);
            toast.error('Failed to delete listing');
        } finally {
            setIsDeleting(false);
            setListingToDelete(null);
        }
    };

    const filteredListings = listings.filter(listing => {
        const matchesSearch = listing.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || listing.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="md:flex md:items-center md:justify-between mb-8">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl sm:truncate">
                            My Listings
                        </h2>
                        <p className="mt-1 text-lg text-gray-500">
                            Manage your product inventory and track performance.
                        </p>
                    </div>
                    <div className="mt-4 flex md:mt-0 md:ml-4">
                        <Link href="/seller/create-listing">
                            <Button className="flex items-center gap-2">
                                <FaPlus /> Create New Listing
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaSearch className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search listings..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <FaFilter className="text-gray-400" />
                        <select
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="sold">Sold</option>
                            <option value="expired">Expired</option>
                        </select>
                    </div>
                </div>

                {/* Listings Table */}
                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    {isLoading ? (
                        <div className="p-8 text-center">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                            <p className="mt-2 text-gray-500">Loading listings...</p>
                        </div>
                    ) : filteredListings.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="mx-auto h-12 w-12 text-gray-400">
                                <FaBoxOpen size={48} />
                            </div>
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No listings found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {searchTerm || filterStatus !== 'all'
                                    ? 'Try adjusting your search or filters.'
                                    : 'Get started by creating a new listing.'}
                            </p>
                            {!searchTerm && filterStatus === 'all' && (
                                <div className="mt-6">
                                    <Link href="/seller/create-listing">
                                        <Button className="flex items-center gap-2 mx-auto">
                                            <FaPlus /> Create Listing
                                        </Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    ) : (
                        <ul className="divide-y divide-gray-200">
                            {filteredListings.map((listing) => (
                                <li key={listing.id}>
                                    <div className="block hover:bg-gray-50 transition duration-150 ease-in-out">
                                        <div className="px-4 py-4 sm:px-6">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-16 w-16 bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                                                        {listing.images && listing.images[0] ? (
                                                            <img className="h-16 w-16 object-cover" src={listing.images[0]} alt={listing.title} />
                                                        ) : (
                                                            <div className="h-full w-full flex items-center justify-center text-gray-400">
                                                                <FaImage />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-indigo-600 truncate max-w-xs sm:max-w-md">
                                                            {listing.title}
                                                        </div>
                                                        <div className="flex items-center mt-1">
                                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${listing.status === 'active' ? 'bg-green-100 text-green-800' :
                                                                listing.status === 'sold' ? 'bg-blue-100 text-blue-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {listing.status.charAt(0).toUpperCase() + listing.status.slice(1)}
                                                            </span>
                                                            <span className="ml-2 text-sm text-gray-500">
                                                                ৳{listing.price.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="hidden sm:flex flex-col items-end text-sm text-gray-500">
                                                        <div className="flex items-center gap-1">
                                                            <FaEye className="text-gray-400" /> {listing.views} views
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <FaTag className="text-gray-400" /> {listing.bids} bids
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Link href={`/seller/listings/${listing.id}/edit`}>
                                                            <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors" title="Edit">
                                                                <FaEdit size={18} />
                                                            </button>
                                                        </Link>
                                                        <button
                                                            onClick={() => handleDeleteClick(listing.id)}
                                                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                                                            title="Delete"
                                                        >
                                                            <FaTrash size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <ConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title="Delete Listing"
                    message="Are you sure you want to delete this listing? This action cannot be undone."
                    confirmText="Delete"
                    variant="danger"
                    isLoading={isDeleting}
                />
            </div>
        </div>
    );
};

// Helper icons
const FaBoxOpen = ({ size, className }: { size?: number, className?: string }) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 640 512" height={size || "1em"} width={size || "1em"} xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M425.7 256c-16.9 0-32.8-9-41.4-23.4L320 126l-64.2 106.6c-8.7 14.5-24.6 23.5-41.5 23.5-4.5 0-9-.6-13.3-1.9L64 215v178c0 14.7 10 27.5 24.2 31l216.2 54.1c10.2 2.5 20.9 2.5 31 0L551.8 424c14.2-3.6 24.2-16.4 24.2-31V215l-137 39.1c-4.3 1.3-8.8 1.9-13.3 1.9zm212.6-112.2L586.8 41c-3.1-6.2-9.8-9.8-16.7-8.9L320 64l91.7 152.1c3.8 6.3 11.4 9.3 18.5 7.3l197.9-56.5c9.9-2.9 14.7-13.9 10.2-23.1zM320 64 69.9 32.1c-6.9-.8-13.5 2.7-16.7 8.9L2.3 143.8c-4.5 9.2.3 20.2 10.2 23.1l197.9 56.5c7.1 2 14.7-1 18.5-7.3L320 64z"></path>
    </svg>
);

const FaImage = ({ size, className }: { size?: number, className?: string }) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height={size || "1em"} width={size || "1em"} xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M464 64H48C21.49 64 0 85.49 0 112v288c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V112c0-26.51-21.49-48-48-48zm-6 336H54a6 6 0 0 1-6-6V118a6 6 0 0 1 6-6h404a6 6 0 0 1 6 6v276a6 6 0 0 1-6 6zM128 152c-22.091 0-40 17.909-40 40s17.909 40 40 40 40-17.909 40-40-17.909-40-40-40zM96 352h320v-80l-87.515-87.515c-4.686-4.686-12.284-4.686-16.971 0L192 304l-39.515-39.515c-4.686-4.686-12.284-4.686-16.971 0L96 304v48z"></path>
    </svg>
);

const FaTag = ({ size, className }: { size?: number, className?: string }) => (
    <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 512 512" height={size || "1em"} width={size || "1em"} xmlns="http://www.w3.org/2000/svg" className={className}>
        <path d="M0 252.118V48C0 21.49 21.49 0 48 0h204.118a48 48 0 0 1 33.941 14.059l211.882 211.882c18.745 18.745 18.745 49.137 0 67.882L293.823 497.941c-18.745 18.745-49.137 18.745-67.882 0L14.059 286.059A48 48 0 0 1 0 252.118zM112 64c-26.51 0-48 21.49-48 48s21.49 48 48 48 48-21.49 48-48-21.49-48-48-48z"></path>
    </svg>
);
