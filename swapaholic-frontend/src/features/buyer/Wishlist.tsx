import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { FaHeart, FaTrash, FaClock, FaShoppingCart, FaFilter } from 'react-icons/fa';
import { wishlistApi, WishlistItem } from '../../api/wishlist';
import { RatingStars } from '../../components/ui/RatingStars';
import { Button } from '../../components/ui/Button';

export const Wishlist = () => {
    const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'active' | 'ending_soon'>('all');

    useEffect(() => {
        fetchWishlist();
    }, []);

    const fetchWishlist = async () => {
        try {
            setIsLoading(true);
            const data = await wishlistApi.getWishlist();
            const items = Array.isArray(data) ? data : (data.items || []);
            setWishlistItems(items);
        } catch (error) {
            console.error('Error fetching wishlist:', error);
            // Mock data for demonstration
            setWishlistItems([
                {
                    id: '1',
                    productId: 'prod-1',
                    product: {
                        id: 'prod-1',
                        title: 'Vintage Canon AE-1 Camera',
                        description: 'Classic film camera in excellent condition',
                        currentBid: 175.00,
                        startingPrice: 100.00,
                        images: ['https://via.placeholder.com/300'],
                        category: 'Electronics',
                        condition: 'Used - Excellent',
                        endTime: new Date(Date.now() + 3600000 * 24).toISOString(),
                        status: 'active',
                    },
                    addedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
                },
                {
                    id: '2',
                    productId: 'prod-2',
                    product: {
                        id: 'prod-2',
                        title: 'Apple MacBook Pro 2019',
                        description: '16-inch, 16GB RAM, 512GB SSD',
                        currentBid: 800.00,
                        startingPrice: 600.00,
                        images: ['https://via.placeholder.com/300'],
                        category: 'Electronics',
                        condition: 'Used - Good',
                        endTime: new Date(Date.now() + 3600000 * 5).toISOString(),
                        status: 'active',
                    },
                    addedAt: new Date(Date.now() - 86400000).toISOString(),
                },
                {
                    id: '3',
                    productId: 'prod-3',
                    product: {
                        id: 'prod-3',
                        title: 'Nike Air Jordan 1 Retro',
                        description: 'Size 10, limited edition colorway',
                        currentBid: 220.00,
                        startingPrice: 150.00,
                        images: ['https://via.placeholder.com/300'],
                        category: 'Fashion',
                        condition: 'Used - Like New',
                        endTime: new Date(Date.now() + 3600000 * 48).toISOString(),
                        status: 'active',
                    },
                    addedAt: new Date().toISOString(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemoveFromWishlist = async (productId: string) => {
        try {
            await wishlistApi.removeFromWishlist(productId);
            setWishlistItems((prev) => prev.filter((item) => item.productId !== productId));
            toast.success('Removed from wishlist');
        } catch (error) {
            console.error('Error removing from wishlist:', error);
            toast.error('Failed to remove from wishlist');
        }
    };

    const handleClearWishlist = async () => {
        if (!window.confirm('Are you sure you want to clear your entire wishlist?')) return;

        try {
            await wishlistApi.clearWishlist();
            setWishlistItems([]);
            toast.success('Wishlist cleared');
        } catch (error) {
            console.error('Error clearing wishlist:', error);
            toast.error('Failed to clear wishlist');
        }
    };

    const getTimeRemaining = (endTime: string) => {
        const now = new Date().getTime();
        const end = new Date(endTime).getTime();
        const diff = end - now;

        if (diff <= 0) return 'Ended';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const filteredItems = wishlistItems.filter((item) => {
        if (filter === 'all') return true;
        if (filter === 'active') return item.product.status === 'active';
        if (filter === 'ending_soon') {
            const hoursRemaining = (new Date(item.product.endTime).getTime() - new Date().getTime()) / (1000 * 60 * 60);
            return hoursRemaining <= 24 && item.product.status === 'active';
        }
        return true;
    });

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <FaHeart className="text-red-500" /> My Wishlist
                        </h1>
                        <p className="mt-2 text-lg text-gray-600">
                            {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'} saved
                        </p>
                    </div>
                    {wishlistItems.length > 0 && (
                        <Button variant="outline" onClick={handleClearWishlist} className="text-red-600 border-red-600 hover:bg-red-50">
                            Clear All
                        </Button>
                    )}
                </div>

                {/* Filters */}
                {wishlistItems.length > 0 && (
                    <div className="bg-white rounded-lg shadow mb-6 p-4">
                        <div className="flex items-center gap-2 flex-wrap">
                            <FaFilter className="text-gray-500" />
                            <button
                                onClick={() => setFilter('all')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                All ({wishlistItems.length})
                            </button>
                            <button
                                onClick={() => setFilter('active')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'active' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Active ({wishlistItems.filter(i => i.product.status === 'active').length})
                            </button>
                            <button
                                onClick={() => setFilter('ending_soon')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'ending_soon' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                Ending Soon
                            </button>
                        </div>
                    </div>
                )}

                {/* Wishlist Items */}
                {isLoading ? (
                    <div className="text-center py-16">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                        <p className="mt-4 text-gray-500">Loading your wishlist...</p>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <FaHeart className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {filter === 'all' ? 'Your wishlist is empty' : 'No items in this category'}
                        </h3>
                        <p className="text-gray-500 mb-6">
                            {filter === 'all'
                                ? 'Start adding products you like to your wishlist'
                                : 'Try changing the filter or browse more products'
                            }
                        </p>
                        <Link href="/products">
                            <Button>Browse Products</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredItems.map((item) => (
                            <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group">
                                {/* Image */}
                                <div className="relative">
                                    <Link href={`/products/${item.product.id}`}>
                                        <img
                                            src={item.product.images[0]}
                                            alt={item.product.title}
                                            className="w-full h-48 object-cover"
                                        />
                                    </Link>
                                    <button
                                        onClick={() => handleRemoveFromWishlist(item.productId)}
                                        className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-md hover:bg-red-50 transition group"
                                        title="Remove from wishlist"
                                    >
                                        <FaHeart className="text-red-500 group-hover:scale-110 transition" />
                                    </button>
                                    {item.product.status === 'ended' && (
                                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                                            <span className="text-white font-bold text-lg">Auction Ended</span>
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-4">
                                    <Link href={`/products/${item.product.id}`}>
                                        <h3 className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition mb-2 line-clamp-2">
                                            {item.product.title}
                                        </h3>
                                    </Link>

                                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                        {item.product.description}
                                    </p>

                                    <div className="space-y-2 mb-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-500">Current Bid</span>
                                            <span className="text-lg font-bold text-indigo-600">
                                                ${item.product.currentBid.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm text-gray-500">Condition</span>
                                            <span className="text-sm font-medium text-gray-900">
                                                {item.product.condition}
                                            </span>
                                        </div>
                                    </div>

                                    {item.product.status === 'active' && (
                                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                                <FaClock className="text-orange-500" />
                                                <span>{getTimeRemaining(item.product.endTime)}</span>
                                            </div>
                                            <Link href={`/products/${item.product.id}`}>
                                                <Button size="sm" className="flex items-center gap-1">
                                                    <FaShoppingCart /> Bid Now
                                                </Button>
                                            </Link>
                                        </div>
                                    )}

                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                        <p className="text-xs text-gray-500">
                                            Added {new Date(item.addedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
