'use client';

import { useState, useEffect } from 'react';
import { FaBookmark, FaTrash, FaClock } from 'react-icons/fa';

interface SavedFilter {
    name: string;
    filters: any;
    timestamp: number;
}

interface SavedFiltersProps {
    onLoadFilter: (filter: SavedFilter) => void;
}

export default function SavedFilters({ onLoadFilter }: SavedFiltersProps) {
    const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);

    useEffect(() => {
        loadSavedFilters();
    }, []);

    const loadSavedFilters = () => {
        const filters = JSON.parse(localStorage.getItem('savedFilters') || '[]');
        setSavedFilters(filters);
    };

    const deleteFilter = (index: number) => {
        const newFilters = savedFilters.filter((_, i) => i !== index);
        localStorage.setItem('savedFilters', JSON.stringify(newFilters));
        setSavedFilters(newFilters);
    };

    const getTimeAgo = (timestamp: number) => {
        const diff = Date.now() - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        return `${minutes}m ago`;
    };

    if (savedFilters.length === 0) {
        return null;
    }

    return (
        <div className="bg-white rounded-lg shadow-md p-4">
            <div className="flex items-center gap-2 mb-3">
                <FaBookmark className="text-indigo-600" />
                <h3 className="font-semibold text-gray-900">Saved Filter Sets</h3>
            </div>

            <div className="flex gap-2 flex-wrap">
                {savedFilters.map((filter, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition"
                    >
                        <button
                            onClick={() => onLoadFilter(filter)}
                            className="flex items-center gap-2"
                        >
                            <span className="text-sm font-medium text-indigo-900">{filter.name}</span>
                            <span className="text-xs text-indigo-600 flex items-center gap-1">
                                <FaClock className="text-xs" />
                                {getTimeAgo(filter.timestamp)}
                            </span>
                        </button>
                        <button
                            onClick={() => deleteFilter(index)}
                            className="text-red-600 hover:text-red-700 ml-2"
                            title="Delete filter"
                        >
                            <FaTrash className="text-xs" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
