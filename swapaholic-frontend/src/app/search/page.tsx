'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FaSearch, FaFilter, FaSlidersH } from 'react-icons/fa';
import { productsApi, Product } from '../../api/products';
import { Button } from '../../components/ui/Button';

function SearchResults() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q') || '';

    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(false);

    // Filters
    const [filters, setFilters] = useState({
        category: 'all',
        condition: 'all',
        priceMin: '',
        priceMax: '',
        sortBy: 'relevant',
    });

    const fetchSearchResults = useCallback(async () => {
        try {
            setIsLoading(true);

            const apiFilters: Record<string, unknown> = {};
            if (filters.category !== 'all') apiFilters.category = filters.category;
            if (filters.condition !== 'all') apiFilters.condition = filters.condition;
            if (filters.priceMin) apiFilters.minPrice = parseFloat(filters.priceMin);
            if (filters.priceMax) apiFilters.maxPrice = parseFloat(filters.priceMax);

            // Map sort options
            switch (filters.sortBy) {
                case 'price_low':
                    apiFilters.sortBy = 'price';
                    apiFilters.sortOrder = 'asc';
                    break;
                case 'price_high':
                    apiFilters.sortBy = 'price';
                    apiFilters.sortOrder = 'desc';
                    break;
                case 'ending_soon':
                    apiFilters.sortBy = 'auctionEndTime';
                    apiFilters.sortOrder = 'asc';
                    break;
                case 'newest':
                    apiFilters.sortBy = 'createdAt';
                    apiFilters.sortOrder = 'desc';
                    break;
            }

            const data = await productsApi.searchProducts(query, apiFilters);
            // Handle PaginatedResponse
            const results = Array.isArray(data) ? data : (data.data || []);
            setProducts(results);
        } catch (error) {
            console.error('Error fetching search results:', error);
            // Mock data
            setProducts([
                {
                    id: '1',
                    title: 'Vintage Canon AE-1 Camera',
                    description: 'Classic film camera in excellent condition',
                    price: 175.00,
                    images: ['https://via.placeholder.com/300'],
                    category: 'Electronics',
                    condition: 'good' as const,
                    sellerId: 'seller-1',
                    sellerName: 'Camera Collector',
                    status: 'active' as const,
                    currentBid: 175.00,
                    bidCount: 12,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    auctionEndTime: new Date(Date.now() + 86400000).toISOString(),
                },
                {
                    id: '2',
                    title: 'Apple MacBook Pro 2019',
                    description: '16-inch, 16GB RAM, 512GB SSD',
                    price: 800.00,
                    images: ['https://via.placeholder.com/300'],
                    category: 'Electronics',
                    condition: 'good' as const,
                    sellerId: 'seller-2',
                    sellerName: 'Tech Seller',
                    status: 'active' as const,
                    currentBid: 800.00,
                    bidCount: 8,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    auctionEndTime: new Date(Date.now() + 86400000 * 2).toISOString(),
                },
            ].filter(p => p.title.toLowerCase().includes(query.toLowerCase())));
        } finally {
            setIsLoading(false);
        }
    }, [query, filters]);

    useEffect(() => {
        fetchSearchResults();
    }, [fetchSearchResults]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters((prev) => ({ ...prev, [key]: value }));
    };

    const handleClearFilters = () => {
        setFilters({
            category: 'all',
            condition: 'all',
            priceMin: '',
            priceMax: '',
            sortBy: 'relevant',
        });
    };

    const getTimeRemaining = (endTime: string) => {
        const now = new Date().getTime();
        const end = new Date(endTime).getTime();
        const diff = end - now;

        if (diff <= 0) return 'Ended';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        if (days > 0) return `${days}d ${hours}h`;
        return `${hours}h`;
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Search Results for "{query}"
                    </h1>
                    <p className="text-gray-600">
                        {isLoading ? 'Searching...' : `${products.length} ${products.length === 1 ? 'result' : 'results'} found`}
                    </p>
                </div>

                <div className="flex gap-6">
                    {/* Filters Sidebar */}
                    <div className={`${showFilters ? 'block' : 'hidden'} lg:block w-full lg:w-64 shrink-0`}>
                        <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <FaFilter /> Filters
                                </h2>
                                <button
                                    onClick={handleClearFilters}
                                    className="text-sm text-indigo-600 hover:text-indigo-800"
                                >
                                    Clear All
                                </button>
                            </div>

                            {/* Category Filter */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Category
                                </label>
                                <select
                                    value={filters.category}
                                    onChange={(e) => handleFilterChange('category', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">All Categories</option>
                                    <option value="Electronics">Electronics</option>
                                    <option value="Fashion">Fashion</option>
                                    <option value="Home & Garden">Home & Garden</option>
                                    <option value="Sports">Sports</option>
                                    <option value="Collectibles">Collectibles</option>
                                    <option value="Automotive">Automotive</option>
                                </select>
                            </div>

                            {/* Condition Filter */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Condition
                                </label>
                                <select
                                    value={filters.condition}
                                    onChange={(e) => handleFilterChange('condition', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="all">All Conditions</option>
                                    <option value="New">New</option>
                                    <option value="Used - Like New">Used - Like New</option>
                                    <option value="Used - Excellent">Used - Excellent</option>
                                    <option value="Used - Good">Used - Good</option>
                                    <option value="Used - Fair">Used - Fair</option>
                                </select>
                            </div>

                            {/* Price Range */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Price Range
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={filters.priceMin}
                                        onChange={(e) => handleFilterChange('priceMin', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <span className="text-gray-500 self-center">-</span>
                                    <input
                                        type="number"
                                        placeholder="Max"
                                        value={filters.priceMax}
                                        onChange={(e) => handleFilterChange('priceMax', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Results */}
                    <div className="flex-1">
                        {/* Mobile Filter Toggle & Sort */}
                        <div className="flex items-center justify-between mb-6 lg:justify-end">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="lg:hidden px-4 py-2 bg-white border border-gray-300 rounded-lg flex items-center gap-2 hover:bg-gray-50"
                            >
                                <FaSlidersH /> Filters
                            </button>

                            <select
                                value={filters.sortBy}
                                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="relevant">Most Relevant</option>
                                <option value="price_low">Price: Low to High</option>
                                <option value="price_high">Price: High to Low</option>
                                <option value="ending_soon">Ending Soon</option>
                                <option value="newest">Newest First</option>
                            </select>
                        </div>

                        {/* Products Grid */}
                        {isLoading ? (
                            <div className="text-center py-16">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                                <p className="mt-4 text-gray-500">Searching...</p>
                            </div>
                        ) : products.length === 0 ? (
                            <div className="bg-white rounded-lg shadow-md p-12 text-center">
                                <FaSearch className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No results found</h3>
                                <p className="text-gray-600 mb-6">
                                    We couldn't find any products matching "{query}"
                                </p>
                                <div className="space-y-3">
                                    <p className="text-sm text-gray-500">Try:</p>
                                    <ul className="text-sm text-gray-600 space-y-1">
                                        <li>• Checking your spelling</li>
                                        <li>• Using more general keywords</li>
                                        <li>• Removing some filters</li>
                                    </ul>
                                </div>
                                <Link href="/products">
                                    <Button className="mt-6">Browse All Products</Button>
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {products.map((product) => (
                                    <Link key={product.id} href={`/products/${product.id}`}>
                                        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow group">
                                            <div className="relative">
                                                <Image
                                                    src={product.images[0]}
                                                    alt={product.title}
                                                    width={400}
                                                    height={192}
                                                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform"
                                                />
                                                <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                                                    {getTimeRemaining(product.auctionEndTime || '')}
                                                </div>
                                            </div>
                                            <div className="p-4">
                                                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                                                    {product.title}
                                                </h3>
                                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                                    {product.description}
                                                </p>
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-xs text-gray-500">Current Bid</p>
                                                        <p className="text-lg font-semibold text-indigo-600">৳{product.currentBid?.toFixed(2) || 'N/A'}</p>
                                                    </div>
                                                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                                        {product.condition}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <SearchResults />
        </Suspense>
    );
}
