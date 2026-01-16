'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { FaFilter, FaSave, FaCompressArrowsAlt } from 'react-icons/fa';
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

function CategoryBrowsePage() {
    const searchParams = useSearchParams();
    const categoryParam = searchParams.get('category');

    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showFilters, setShowFilters] = useState(true);
    const [showComparison, setShowComparison] = useState(false);
    const [comparisonItems, setComparisonItems] = useState<string[]>([]);

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
                category: filters.categories.join(','),
                condition: filters.conditions.join(',') as any,
                minPrice: filters.priceRange[0],
                maxPrice: filters.priceRange[1],
                sortBy: filters.sortBy,
            });
            setProducts(data.data || []);
        } catch (err) {
            console.error('Error fetching products:', err);
            toast.error('Failed to load products');
            // Mock data
            setProducts(Array.from({ length: 12 }, (_, i) => ({
                id: `prod-${i + 1}`,
                title: `Product ${i + 1}`,
                description: `Description for Product ${i + 1}`,
                price: Math.floor(Math.random() * 500) + 100,
                images: ['/placeholder-product.jpg'],
                category: ['Electronics', 'Fashion', 'Home'][Math.floor(Math.random() * 3)],
                condition: (['new', 'like-new', 'good', 'fair', 'poor'] as const)[Math.floor(Math.random() * 5)],
                sellerId: `seller-${i + 1}`,
                sellerName: `Seller ${i + 1}`,
                status: 'active' as const,
                currentBid: Math.floor(Math.random() * 500) + 100,
                bidCount: Math.floor(Math.random() * 20) + 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                auctionEndTime: new Date(Date.now() + Math.random() * 86400000 * 7).toISOString(),
            })));
        } finally {
            setIsLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleFilterChange = (newFilters: Partial<BrowseFilters>) => {
        setFilters({ ...filters, ...newFilters });
    };

    const handleSaveFilters = () => {
        const savedFilters = JSON.parse(localStorage.getItem('savedFilters') || '[]');
        const filterName = prompt('Name for this filter set:');
        if (filterName) {
            savedFilters.push({ name: filterName, filters, timestamp: Date.now() });
            localStorage.setItem('savedFilters', JSON.stringify(savedFilters));
            toast.success('Filters saved!');
        }
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
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                            Browse Products 🔍
                        </h1>
                        <p className="text-gray-600">
                            {products.length} products found
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
                            onClick={handleSaveFilters}
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
                            <ProductGrid
                                products={products}
                                comparisonItems={comparisonItems}
                                onToggleComparison={toggleComparison}
                            />
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
            </div>
        </div>
    );
}

export default function BrowsePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <CategoryBrowsePage />
        </Suspense>
    );
}
