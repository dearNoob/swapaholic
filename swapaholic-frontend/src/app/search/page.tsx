'use client';

import React, { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAppDispatch } from '../../store/hooks';
import { setFilters, clearFilters } from '../../store/listingSlice';
import { ProductList } from '../../features/buyer/ProductList';

function SearchLogic() {
    const searchParams = useSearchParams();
    const dispatch = useAppDispatch();

    useEffect(() => {
        // Parse query params
        const q = searchParams.get('q') || '';
        const category = searchParams.get('category');
        const minPrice = searchParams.get('minPrice');
        const maxPrice = searchParams.get('maxPrice');
        const condition = searchParams.get('condition');

        // Reset first to avoid stale state
        dispatch(clearFilters());

        // Dispatch new filters
        dispatch(setFilters({
            searchQuery: q,
            category: category || null,
            priceMin: minPrice ? parseFloat(minPrice) : 0,
            priceMax: maxPrice ? parseFloat(maxPrice) : 10000,
            condition: condition ? condition.split(',') : [],
        }));
    }, [searchParams, dispatch]);

    return <ProductList />;
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <SearchLogic />
        </Suspense>
    );
}
