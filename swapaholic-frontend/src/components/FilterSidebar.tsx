'use client';

import { useState } from 'react';
import { FaTimes, FaFilter } from 'react-icons/fa';

interface FilterSidebarProps {
  filters: {
    category: string | null;
    priceMin: number;
    priceMax: number;
    condition: string[];
    status: string[];
  };
  onFilterChange: (filters: Partial<FilterSidebarProps['filters']>) => void;
  onClearFilters: () => void;
}

const categories = [
  'Electronics',
  'Fashion',
  'Home & Garden',
  'Sports & Outdoors',
  'Toys & Games',
  'Books',
  'Automotive',
  'Other',
];

const conditions = ['New', 'Like New', 'Good', 'Fair'];
const statuses = ['Active', 'Ending Soon', 'Verified'];

export default function FilterSidebar({ filters, onFilterChange, onClearFilters }: FilterSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleCategoryChange = (category: string) => {
    onFilterChange({ category: filters.category === category ? null : category });
  };

  const handleConditionChange = (condition: string) => {
    const newConditions = filters.condition.includes(condition)
      ? filters.condition.filter((c) => c !== condition)
      : [...filters.condition, condition];
    onFilterChange({ condition: newConditions });
  };

  const handleStatusChange = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter((s) => s !== status)
      : [...filters.status, status];
    onFilterChange({ status: newStatuses });
  };

  const handlePriceChange = (type: 'min' | 'max', value: number) => {
    onFilterChange({ [type === 'min' ? 'priceMin' : 'priceMax']: value });
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full bg-indigo-600 px-6 py-3 text-white shadow-lg hover:bg-indigo-700"
      >
        <FaFilter />
        Filters
      </button>

      {/* Overlay for Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:sticky top-0 left-0 z-50 h-full lg:h-auto w-80 bg-white shadow-xl lg:shadow-none transition-transform duration-300 overflow-y-auto ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FaFilter className="text-indigo-600" />
              Filters
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <FaTimes />
            </button>
          </div>

          {/* Clear Filters */}
          <button
            onClick={onClearFilters}
            className="w-full mb-6 px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-600 rounded-lg hover:bg-indigo-50 transition"
          >
            Clear All Filters
          </button>

          {/* Price Range */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Price Range</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Min Price ($)</label>
                <input
                  type="number"
                  min="0"
                  value={filters.priceMin}
                  onChange={(e) => handlePriceChange('min', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Max Price ($)</label>
                <input
                  type="number"
                  min="0"
                  value={filters.priceMax || ''}
                  onChange={(e) => handlePriceChange('max', Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900"
                  placeholder="Any"
                />
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Category</h3>
            <div className="space-y-2">
              {categories.map((category) => (
                <label key={category} className="flex items-center cursor-pointer group">
                  <input
                    type="radio"
                    name="category"
                    checked={filters.category === category}
                    onChange={() => handleCategoryChange(category)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span className="ml-3 text-sm text-gray-700 group-hover:text-indigo-600">
                    {category}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Condition</h3>
            <div className="space-y-2">
              {conditions.map((condition) => (
                <label key={condition} className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.condition.includes(condition)}
                    onChange={() => handleConditionChange(condition)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700 group-hover:text-indigo-600">
                    {condition}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Status</h3>
            <div className="space-y-2">
              {statuses.map((status) => (
                <label key={status} className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={filters.status.includes(status)}
                    onChange={() => handleStatusChange(status)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-sm text-gray-700 group-hover:text-indigo-600">
                    {status}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
