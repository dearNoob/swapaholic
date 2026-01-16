'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaSearch, FaClock, FaTimes } from 'react-icons/fa';
import { productsApi } from '../../api/products';

export default function SearchBar() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load search history from localStorage
        const history = localStorage.getItem('searchHistory');
        if (history) {
            setSearchHistory(JSON.parse(history));
        }

        // Click outside to close suggestions
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        // Fetch autocomplete suggestions
        const fetchSuggestions = async () => {
            if (searchQuery.trim().length > 2) {
                try {
                    const data = await productsApi.getProducts({});
                    const products = Array.isArray(data) ? data : (data.data || []);
                    const filtered = products
                        .filter((p: any) =>
                            p.title?.toLowerCase().includes(searchQuery.toLowerCase())
                        )
                        .slice(0, 5);
                    setSuggestions(filtered);
                } catch (error) {
                    console.error('Error fetching suggestions:', error);
                    // Mock suggestions
                    setSuggestions([
                        { id: '1', title: 'Vintage Camera', currentBid: 150 },
                        { id: '2', title: 'MacBook Pro', currentBid: 800 },
                    ].filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase())));
                }
            } else {
                setSuggestions([]);
            }
        };

        const debounce = setTimeout(fetchSuggestions, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            performSearch(searchQuery);
        }
    };

    const performSearch = (query: string) => {
        // Add to search history
        const newHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 5);
        setSearchHistory(newHistory);
        localStorage.setItem('searchHistory', JSON.stringify(newHistory));

        // Navigate to search results
        router.push(`/search?q=${encodeURIComponent(query)}`);
        setSearchQuery('');
        setShowSuggestions(false);
    };

    const handleClearHistory = () => {
        setSearchHistory([]);
        localStorage.removeItem('searchHistory');
    };

    const handleHistoryClick = (query: string) => {
        setSearchQuery(query);
        performSearch(query);
    };

    return (
        <div ref={searchRef} className="relative w-full">
            <form onSubmit={handleSearch} className="relative">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaSearch className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="Search for products..."
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white text-gray-900"
                    />
                </div>
            </form>

            {/* Autocomplete Dropdown */}
            {showSuggestions && (searchQuery.trim() || searchHistory.length > 0) && (
                <div className="absolute z-50 mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-200 max-h-96 overflow-y-auto">
                    {/* Search History */}
                    {searchQuery.trim() === '' && searchHistory.length > 0 && (
                        <div className="p-2">
                            <div className="flex items-center justify-between px-3 py-2">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Recent Searches</span>
                                <button
                                    onClick={handleClearHistory}
                                    className="text-xs text-indigo-600 hover:text-indigo-800"
                                >
                                    Clear All
                                </button>
                            </div>
                            {searchHistory.map((query, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleHistoryClick(query)}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-md text-left"
                                >
                                    <FaClock className="text-gray-400 flex-shrink-0" />
                                    <span className="text-sm text-gray-900 flex-1">{query}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Product Suggestions */}
                    {searchQuery.trim() && suggestions.length > 0 && (
                        <div className="p-2">
                            <div className="px-3 py-2">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Products</span>
                            </div>
                            {suggestions.map((product) => (
                                <Link
                                    key={product.id}
                                    href={`/products/${product.id}`}
                                    onClick={() => setShowSuggestions(false)}
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-md"
                                >
                                    <FaSearch className="text-gray-400 flex-shrink-0 text-xs" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-900 truncate">{product.title}</p>
                                        <p className="text-xs text-gray-500">Current bid: ${product.currentBid?.toFixed(2) || 'N/A'}</p>
                                    </div>
                                </Link>
                            ))}
                            <button
                                onClick={() => performSearch(searchQuery)}
                                className="w-full mt-2 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-md text-left font-medium"
                            >
                                See all results for "{searchQuery}"
                            </button>
                        </div>
                    )}

                    {/* No Results */}
                    {searchQuery.trim() && suggestions.length === 0 && (
                        <div className="p-8 text-center">
                            <p className="text-gray-500">No products found</p>
                            <button
                                onClick={() => performSearch(searchQuery)}
                                className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                            >
                                Search anyway
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
