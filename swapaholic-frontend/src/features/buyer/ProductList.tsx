'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setProducts, setLoading, setError, setFilters, setPagination, setSort, setViewMode, clearFilters } from '../../store/listingSlice';
import { productsApi } from '../../api/products';

interface ProductFiltersState {
    category: string | null;
    priceMin: number;
    priceMax: number;
    condition: string[];
    status: string[];
    searchQuery: string;
    lat: number | null;
    lng: number | null;
    radius: number | null;
}
import ProductCard from '../../components/ProductCard';
import FilterSidebar from '../../components/FilterSidebar';
import Pagination from '../../components/Pagination';
import { FaTh, FaList, FaSearch } from 'react-icons/fa';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('../../components/maps/MapView'), {
    ssr: false,
    loading: () => <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">Loading map...</div>
});
import 'leaflet/dist/leaflet.css';

export const ProductList = () => {
    const dispatch = useAppDispatch();
    const { products, isLoading, error, filters, pagination, sort, viewMode } = useAppSelector((state) => state.listing);
    const [searchInput, setSearchInput] = useState(filters.searchQuery);
    const [geoError, setGeoError] = useState<string | null>(null);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchInput !== filters.searchQuery) {
                dispatch(setFilters({ searchQuery: searchInput }));
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchInput, filters.searchQuery, dispatch]);

    // Fetch products when filters/pagination/sort change
    useEffect(() => {
        const fetchProducts = async () => {
            dispatch(setLoading(true));
            try {
                // Build query params
                const params: Record<string, unknown> = {
                    page: pagination.page,
                    limit: pagination.limit,
                    sortBy: sort.sortBy,
                    sortOrder: sort.sortOrder,
                };

                if (filters.searchQuery) params.search = filters.searchQuery;
                if (filters.category) params.category = filters.category;
                if (filters.priceMin > 0) params.priceMin = filters.priceMin;
                if (filters.priceMax < 10000) params.priceMax = filters.priceMax;
                if (filters.condition.length > 0) params.condition = filters.condition.join(',');
                if (filters.status.length > 0) params.status = filters.status.join(',');

                // Geolocation params
                if (filters.lat && filters.lng && filters.radius) {
                    params.lat = filters.lat;
                    params.lng = filters.lng;
                    params.radius = filters.radius;
                }

                const data = await productsApi.getProducts(params);

                // Handle both array and paginated response formats
                if (Array.isArray(data)) {
                    dispatch(setProducts({ products: data, total: data.length }));
                } else {
                    dispatch(setProducts({
                        products: data.data || [],
                        total: data.total || 0
                    }));
                }
            } catch (err: unknown) {
                dispatch(setError(err instanceof Error ? err.message : 'Failed to fetch products'));
            } finally {
                dispatch(setLoading(false));
            }
        };

        fetchProducts();
    }, [dispatch, filters, pagination.page, pagination.limit, sort]);

    const handleFilterChange = useCallback((newFilters: Partial<ProductFiltersState>) => {
        dispatch(setFilters(newFilters));
    }, [dispatch]);

    const handleClearFilters = useCallback(() => {
        dispatch(clearFilters());
        setSearchInput('');
        setGeoError(null);
    }, [dispatch]);

    const handlePageChange = useCallback((page: number) => {
        dispatch(setPagination({ page }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [dispatch]);

    const handleItemsPerPageChange = useCallback((limit: number) => {
        dispatch(setPagination({ limit, page: 1 }));
    }, [dispatch]);

    const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const [sortBy, sortOrder] = e.target.value.split('-') as ['price' | 'createdAt' | 'popularity', 'asc' | 'desc'];
        dispatch(setSort({ sortBy, sortOrder }));
    }, [dispatch]);

    const handleFindNearby = () => {
        if (!navigator.geolocation) {
            setGeoError('Geolocation is not supported by your browser');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                // Default radius 5 km
                dispatch(setFilters({ lat: latitude, lng: longitude, radius: 5 }));
                setGeoError(null);
            },
            (error) => {
                setGeoError(error.message);
            }
        );
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                        {filters.searchQuery ? `Search Results for "${filters.searchQuery}"` : 'Browse Products'}
                    </h1>
                    <p className="text-lg text-gray-600">
                        {filters.searchQuery
                            ? `Found ${pagination.total} results`
                            : 'Discover amazing second-hand items'}
                    </p>
                </div>

                {/* Search Bar */}
                <div className="mb-6">
                    <div className="relative max-w-2xl flex items-center">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <FaSearch className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm text-gray-900"
                        />
                        <button
                            onClick={handleFindNearby}
                            className="ml-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition whitespace-nowrap"
                        >
                            Find Nearby
                        </button>

                        {filters.lat && filters.lng && (
                            <select
                                value={filters.radius || 5}
                                onChange={(e) => dispatch(setFilters({ radius: Number(e.target.value) }))}
                                className="ml-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                            >
                                <option value={5}>5 km</option>
                                <option value={10}>10 km</option>
                                <option value={20}>20 km</option>
                                <option value={50}>50 km</option>
                            </select>
                        )}
                    </div>
                    {geoError && <p className="text-red-600 mt-2 text-sm">{geoError}</p>}
                </div>

                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Filter Sidebar */}
                    <aside className="lg:w-80 shrink-0">
                        <FilterSidebar
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onClearFilters={handleClearFilters}
                        />
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1">
                        {/* Toolbar */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-white p-4 rounded-lg shadow">
                            <p className="text-sm text-gray-700">
                                {isLoading ? 'Loading...' : `${pagination.total} products found`}
                            </p>

                            <div className="flex items-center gap-4">
                                {/* Sort Dropdown */}
                                <select
                                    value={`${sort.sortBy}-${sort.sortOrder}`}
                                    onChange={handleSortChange}
                                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                                >
                                    <option value="createdAt-desc">Newest First</option>
                                    <option value="createdAt-asc">Oldest First</option>
                                    <option value="price-asc">Price: Low to High</option>
                                    <option value="price-desc">Price: High to Low</option>
                                    <option value="popularity-desc">Most Popular</option>
                                </select>

                                {/* View Toggle */}
                                <div className="flex gap-2 border border-gray-300 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => dispatch(setViewMode('grid'))}
                                        className={`p-2 ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                        aria-label="Grid view"
                                    >
                                        <FaTh />
                                    </button>
                                    <button
                                        onClick={() => dispatch(setViewMode('list'))}
                                        className={`p-2 ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                                        aria-label="List view"
                                    >
                                        <FaList />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Loading State */}
                        {isLoading && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {Array.from({ length: 8 }).map((_, i) => (
                                    <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden">
                                        <div className="h-56 bg-gray-200 animate-pulse" />
                                        <div className="p-4 space-y-3">
                                            <div className="h-4 bg-gray-200 rounded animate-pulse" />
                                            <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Error State */}
                        {error && !isLoading && (
                            <div className="text-center py-12 bg-red-50 rounded-lg">
                                <p className="text-red-600 font-medium">{error}</p>
                                <button
                                    onClick={handleClearFilters}
                                    className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                                >
                                    Clear Filters
                                </button>
                            </div>
                        )}

                        {/* Products Grid/List */}
                        {!isLoading && !error && (
                            <>
                                {/* Map View */}
                                {filters.lat && filters.lng && (
                                    <div className="mb-6 rounded-lg overflow-hidden shadow-lg border border-gray-200">
                                        <MapView products={products} center={[filters.lat, filters.lng]} />
                                    </div>
                                )}

                                <div className={viewMode === 'grid'
                                    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                                    : 'space-y-4'
                                }>
                                    {products.map((product) => (
                                        <ProductCard key={product.id} product={product} viewMode={viewMode} />
                                    ))}
                                </div>

                                {/* Empty State */}
                                {products.length === 0 && (
                                    <div className="text-center py-16 bg-white rounded-lg shadow">
                                        <div className="text-gray-400 mb-4">
                                            <svg className="mx-auto h-24 w-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
                                        <p className="text-gray-600 mb-6">Try adjusting your filters or search query</p>
                                        <button
                                            onClick={handleClearFilters}
                                            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
                                        >
                                            Clear All Filters
                                        </button>
                                    </div>
                                )}

                                {/* Pagination */}
                                {products.length > 0 && pagination.totalPages > 1 && (
                                    <Pagination
                                        currentPage={pagination.page}
                                        totalPages={pagination.totalPages}
                                        totalItems={pagination.total}
                                        itemsPerPage={pagination.limit}
                                        onPageChange={handlePageChange}
                                        onItemsPerPageChange={handleItemsPerPageChange}
                                    />
                                )}
                            </>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
};
