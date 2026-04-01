'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { FaFilter, FaSave, FaCompressArrowsAlt, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { productsApi, Product } from '../../api/products';

interface BrowseFilters {
    categories: string[];
    conditions: string[];
    priceRange: [number, number];
    sortBy: string;
}

interface SavedFilter {
    name: string;
    filters: BrowseFilters;
    timestamp: number;
}
import AdvancedFilters from '../../components/products/AdvancedFilters';
import ProductGrid from '../../components/products/ProductGrid';
import ProductComparison from '../../components/products/ProductComparison';
import SavedFilters from '../../components/products/SavedFilters';
import Breadcrumbs from '../../components/ui/Breadcrumbs';

function CategoryBrowsePage() {
    const searchParams = useSearchParams();
    const categoryParam = searchParams.get('category');

    const [products, setProducts] = useState<Product[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(true);
    const [showComparison, setShowComparison] = useState(false);
    const [comparisonItems, setComparisonItems] = useState<string[]>([]);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [filterName, setFilterName] = useState('');

    const [filters, setFilters] = useState({
        categories: categoryParam ? [categoryParam] : [],
        conditions: [] as string[],
        priceRange: [0, 10000] as [number, number],
        sortBy: 'relevant' as string,
    });

    const fetchProducts = useCallback(async () => {
        try {
            setIsLoading(true);
            const data = await productsApi.getProducts({
                page: currentPage,
                limit: 12,
                category: filters.categories.join(','),
                condition: filters.conditions.join(',') as any,
                minPrice: filters.priceRange[0],
                maxPrice: filters.priceRange[1],
                sortBy: filters.sortBy,
            });
            // data matches PaginatedResponse signature
            setProducts(data.data || []);
            setTotalPages(data.totalPages || 1);
            setTotalProducts(data.total || 0);
        } catch (err) {
            console.error('Error fetching products:', err);
            toast.error('Failed to load products');
            setProducts([]);
        } finally {
            setIsLoading(false);
        }
    }, [filters, currentPage]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleFilterChange = (newFilters: Partial<BrowseFilters>) => {
        setFilters({ ...filters, ...newFilters });
        setCurrentPage(1); // Reset to first page on filter change
    };

    const handleSaveFilters = () => {
        if (!filterName.trim()) return;
        const savedFilters = JSON.parse(localStorage.getItem('savedFilters') || '[]');
        savedFilters.push({ name: filterName.trim(), filters, timestamp: Date.now() });
        localStorage.setItem('savedFilters', JSON.stringify(savedFilters));
        toast.success('Filters saved!');
        setFilterName('');
        setShowSaveModal(false);
    };

    const handleLoadFilter = (savedFilter: SavedFilter) => {
        setFilters(savedFilter.filters);
        toast.success('Filters loaded!');
    };

    const toggleComparison = (productId: string) => {
        if (comparisonItems.includes(productId)) {
            setComparisonItems(comparisonItems.filter(id => id !== productId));
        } else if (comparisonItems.length < 4) {
            setComparisonItems([...comparisonItems, productId]);
        } else {
            toast.warning('Maximum 4 products for comparison');
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Breadcrumbs */}
                <Breadcrumbs className="mb-4" />

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                            Browse Products
                        </h1>
                        <p className="text-gray-600">
                            {totalProducts} products found
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                        >
                            <FaFilter />
                            {showFilters ? 'Hide' : 'Show'} Filters
                        </button>
                        <button
                            onClick={() => setShowSaveModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                        >
                            <FaSave />
                            Save Filters
                        </button>
                        {comparisonItems.length > 0 && (
                            <button
                                onClick={() => setShowComparison(!showComparison)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                            >
                                <FaCompressArrowsAlt />
                                Compare ({comparisonItems.length})
                            </button>
                        )}
                    </div>
                </div>

                {/* Saved Filters */}
                <div className="mb-6">
                    <SavedFilters onLoadFilter={handleLoadFilter} />
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Filters Sidebar */}
                    {showFilters && (
                        <div className="lg:col-span-1">
                            <AdvancedFilters
                                filters={filters}
                                onFilterChange={handleFilterChange}
                            />
                        </div>
                    )}

                    {/* Products Grid */}
                    <div className={showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}>
                        {isLoading ? (
                            <div className="text-center py-16">
                                <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
                                <p className="text-gray-600">Loading products...</p>
                            </div>
                        ) : (
                            <>
                                <ProductGrid
                                    products={products}
                                    comparisonItems={comparisonItems}
                                    onToggleComparison={toggleComparison}
                                />
                                
                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="mt-8 flex justify-center items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                            disabled={currentPage === 1 || isLoading}
                                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
                                        >
                                            Previous
                                        </button>
                                        <div className="flex items-center gap-1 mx-2">
                                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                <button
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`w-10 h-10 rounded-lg font-medium transition ${
                                                        currentPage === page 
                                                            ? 'bg-indigo-600 text-white' 
                                                            : 'text-gray-700 hover:bg-gray-100'
                                                    }`}
                                                >
                                                    {page}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                            disabled={currentPage === totalPages || isLoading}
                                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
                                        >
                                            Next
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Product Comparison Modal */}
                {showComparison && comparisonItems.length > 0 && (
                    <ProductComparison
                        productIds={comparisonItems}
                        products={products.filter(p => comparisonItems.includes(p.id)).map(p => ({
                            id: p.id,
                            title: p.title,
                            image: p.images[0] || '',
                            currentBid: p.currentBid || p.price,
                            endTime: p.auctionEndTime || '',
                            bids: p.bidCount || 0,
                            condition: p.condition,
                            category: p.category
                        }))}
                        onClose={() => setShowComparison(false)}
                        onRemove={(id) => setComparisonItems(comparisonItems.filter(i => i !== id))}
                    />
                )}
                {/* Save Filter Modal */}
                {showSaveModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowSaveModal(false)} />
                        <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-fade-in">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-gray-900">Save Filter Set</h3>
                                <button onClick={() => setShowSaveModal(false)} className="p-1 text-gray-400 hover:text-gray-600 transition">
                                    <FaTimes />
                                </button>
                            </div>
                            <input
                                type="text"
                                value={filterName}
                                onChange={(e) => setFilterName(e.target.value)}
                                placeholder="Enter a name for this filter..."
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm mb-4"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveFilters()}
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowSaveModal(false)}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveFilters}
                                    disabled={!filterName.trim()}
                                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function BrowsePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        }>
            <CategoryBrowsePage />
        </Suspense>
    );
}
