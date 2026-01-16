'use client';

import { useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

interface AdvancedFiltersProps {
    filters: {
        categories: string[];
        conditions: string[];
        priceRange: [number, number];
        sortBy: string;
    };
    onFilterChange: (filters: any) => void;
}

export default function AdvancedFilters({ filters, onFilterChange }: AdvancedFiltersProps) {
    const [expandedSections, setExpandedSections] = useState({
        categories: true,
        conditions: true,
        price: true,
        sort: true,
    });

    const categories = [
        'Electronics',
        'Fashion',
        'Home & Garden',
        'Sports & Outdoors',
        'Toys & Games',
        'Books & Media',
        'Art & Collectibles',
        'Automotive',
    ];

    const conditions = ['New', 'Like New', 'Used - Excellent', 'Used - Good', 'Used - Fair'];

    const sortOptions = [
        { value: 'relevant', label: 'Most Relevant' },
        { value: 'price-low', label: 'Price: Low to High' },
        { value: 'price-high', label: 'Price: High to Low' },
        { value: 'ending-soon', label: 'Ending Soon' },
        { value: 'newest', label: 'Newly Listed' },
        { value: 'most-bids', label: 'Most Bids' },
    ];

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections({ ...expandedSections, [section]: !expandedSections[section] });
    };

    const handleCategoryToggle = (category: string) => {
        const newCategories = filters.categories.includes(category)
            ? filters.categories.filter(c => c !== category)
            : [...filters.categories, category];
        onFilterChange({ categories: newCategories });
    };

    const handleConditionToggle = (condition: string) => {
        const newConditions = filters.conditions.includes(condition)
            ? filters.conditions.filter(c => c !== condition)
            : [...filters.conditions, condition];
        onFilterChange({ conditions: newConditions });
    };

    const handlePriceChange = (index: 0 | 1, value: number) => {
        const newRange: [number, number] = [...filters.priceRange];
        newRange[index] = value;
        onFilterChange({ priceRange: newRange });
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Filters</h2>

            {/* Categories */}
            <div className="border-t pt-4">
                <button
                    onClick={() => toggleSection('categories')}
                    className="flex items-center justify-between w-full mb-3"
                >
                    <span className="font-semibold text-gray-900">Categories</span>
                    {expandedSections.categories ? <FaChevronUp /> : <FaChevronDown />}
                </button>
                {expandedSections.categories && (
                    <div className="space-y-2">
                        {categories.map((category) => (
                            <label key={category} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.categories.includes(category)}
                                    onChange={() => handleCategoryToggle(category)}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-700">{category}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Condition */}
            <div className="border-t pt-4">
                <button
                    onClick={() => toggleSection('conditions')}
                    className="flex items-center justify-between w-full mb-3"
                >
                    <span className="font-semibold text-gray-900">Condition</span>
                    {expandedSections.conditions ? <FaChevronUp /> : <FaChevronDown />}
                </button>
                {expandedSections.conditions && (
                    <div className="space-y-2">
                        {conditions.map((condition) => (
                            <label key={condition} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.conditions.includes(condition)}
                                    onChange={() => handleConditionToggle(condition)}
                                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                />
                                <span className="text-sm text-gray-700">{condition}</span>
                            </label>
                        ))}
                    </div>
                )}
            </div>

            {/* Price Range */}
            <div className="border-t pt-4">
                <button
                    onClick={() => toggleSection('price')}
                    className="flex items-center justify-between w-full mb-3"
                >
                    <span className="font-semibold text-gray-900">Price Range</span>
                    {expandedSections.price ? <FaChevronUp /> : <FaChevronDown />}
                </button>
                {expandedSections.price && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label className="text-xs text-gray-600">Min</label>
                                <input
                                    type="number"
                                    value={filters.priceRange[0]}
                                    onChange={(e) => handlePriceChange(0, parseInt(e.target.value) || 0)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="0"
                                />
                            </div>
                            <span className="text-gray-500 mt-5">-</span>
                            <div className="flex-1">
                                <label className="text-xs text-gray-600">Max</label>
                                <input
                                    type="number"
                                    value={filters.priceRange[1]}
                                    onChange={(e) => handlePriceChange(1, parseInt(e.target.value) || 10000)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    placeholder="10000"
                                />
                            </div>
                        </div>

                        {/* Price Range Slider */}
                        <div className="px-2">
                            <input
                                type="range"
                                min="0"
                                max="10000"
                                step="100"
                                value={filters.priceRange[1]}
                                onChange={(e) => handlePriceChange(1, parseInt(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>৳0</span>
                                <span>৳10,000+</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Sort By */}
            <div className="border-t pt-4">
                <button
                    onClick={() => toggleSection('sort')}
                    className="flex items-center justify-between w-full mb-3"
                >
                    <span className="font-semibold text-gray-900">Sort By</span>
                    {expandedSections.sort ? <FaChevronUp /> : <FaChevronDown />}
                </button>
                {expandedSections.sort && (
                    <select
                        value={filters.sortBy}
                        onChange={(e) => onFilterChange({ sortBy: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        {sortOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Clear All */}
            <button
                onClick={() => onFilterChange({
                    categories: [],
                    conditions: [],
                    priceRange: [0, 10000],
                    sortBy: 'relevant',
                })}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
                Clear All Filters
            </button>
        </div>
    );
}
