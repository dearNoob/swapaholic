'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaSearch, FaClock, FaTimes, FaTag, FaChevronRight, FaArrowRight } from 'react-icons/fa';
import { productsApi } from '../../api/products';

export default function SearchBar() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestions, setSuggestions] = useState<{ type: 'category' | 'title', value: string }[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load search history from localStorage
        const history = localStorage.getItem('swapaholic_search_history');
        if (history) {
            try {
                setSearchHistory(JSON.parse(history));
            } catch (e) {
                setSearchHistory([]);
            }
        }

        // Click outside to close sessions
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        // Fetch autocomplete suggestions from backend
        const fetchSuggestions = async () => {
            if (searchQuery.trim().length > 1) {
                try {
                    const data = await productsApi.getSearchSuggestions(searchQuery);
                    setSuggestions(data || []);
                } catch (error) {
                    console.error('Error fetching suggestions:', error);
                    setSuggestions([]);
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
        localStorage.setItem('swapaholic_search_history', JSON.stringify(newHistory));

        // Navigate to search results
        router.push(`/products?search=${encodeURIComponent(query)}`);
        setSearchQuery('');
        setShowSuggestions(false);
    };

    const handleClearHistory = () => {
        setSearchHistory([]);
        localStorage.removeItem('swapaholic_search_history');
    };

    const handleHistoryClick = (query: string) => {
        setSearchQuery(query);
        performSearch(query);
    };

    return (
        <div ref={searchRef} className="relative w-full">
            <form onSubmit={handleSearch} className="relative">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FaSearch className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setShowSuggestions(true)}
                        placeholder="Search for treasures..."
                        className="block w-full pl-11 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-slate-900 dark:text-white"
                    />
                    {searchQuery && (
                        <button 
                            type="button" 
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                            <FaTimes className="h-3 w-3" />
                        </button>
                    )}
                </div>
            </form>

            {/* Suggestions Dropdown */}
            {showSuggestions && (searchQuery.trim() || searchHistory.length > 0) && (
                <div className="absolute z-[60] mt-3 w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Recent Searches Header */}
                    {searchQuery.trim() === '' && searchHistory.length > 0 && (
                        <div className="p-2">
                            <div className="flex items-center justify-between px-3 py-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Searches</span>
                                <button
                                    onClick={handleClearHistory}
                                    className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 uppercase tracking-widest"
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="space-y-1">
                                {searchHistory.map((query, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleHistoryClick(query)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-left transition-colors group"
                                    >
                                        <FaClock className="text-slate-300 group-hover:text-slate-400 dark:text-slate-600 text-xs" />
                                        <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">{query}</span>
                                        <FaChevronRight className="text-[10px] text-slate-200 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Backend Suggestions */}
                    {searchQuery.trim() !== '' && suggestions.length > 0 && (
                        <div className="p-2">
                            <div className="px-3 py-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Suggestions</span>
                            </div>
                            <div className="space-y-1">
                                {suggestions.map((suggestion, index) => (
                                    <button
                                        key={index}
                                        onClick={() => performSearch(suggestion.value)}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-left transition-colors group"
                                    >
                                        {suggestion.type === 'category' ? (
                                            <FaTag className="text-indigo-400 dark:text-indigo-500 text-xs" />
                                        ) : (
                                            <FaSearch className="text-slate-300 group-hover:text-slate-400 dark:text-slate-600 text-xs" />
                                        )}
                                        <div className="flex-1">
                                            <span className="text-sm text-slate-900 dark:text-white font-medium">{suggestion.value}</span>
                                            {suggestion.type === 'category' && (
                                                <span className="ml-2 text-[10px] bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-tighter">Category</span>
                                            )}
                                        </div>
                                        <FaChevronRight className="text-[10px] text-slate-200 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                                    </button>
                                ))}
                            </div>
                            
                            <div className="mt-2 pt-2 border-t border-slate-50 dark:border-slate-800">
                                <button
                                    onClick={() => performSearch(searchQuery)}
                                    className="w-full flex items-center justify-between px-3 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-xl text-left transition-colors font-semibold text-sm"
                                >
                                    <span>See all results for "{searchQuery}"</span>
                                    <FaArrowRight className="text-xs" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* No Suggestions found */}
                    {searchQuery.trim() !== '' && suggestions.length === 0 && (
                        <div className="p-8 text-center">
                            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                                <FaSearch className="text-slate-300" />
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">No quick results found</p>
                            <button
                                onClick={() => performSearch(searchQuery)}
                                className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
                            >
                                SEARCH ANYWAY
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
