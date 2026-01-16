'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaExclamationTriangle, FaBoxOpen, FaArrowRight } from 'react-icons/fa';

interface InventoryItem {
    id: string;
    name: string;
    image: string;
    stock: number;
    threshold: number;
    status: 'low' | 'out';
}

interface InventoryAlertsProps {
    items?: InventoryItem[];
}

export default function InventoryAlerts({ items }: InventoryAlertsProps) {
    // Mock data
    const mockItems: InventoryItem[] = [
        {
            id: '1',
            name: 'Wireless Gaming Mouse',
            image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=100&q=80',
            stock: 2,
            threshold: 5,
            status: 'low'
        },
        {
            id: '2',
            name: 'Mechanical Keyboard',
            image: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=100&q=80',
            stock: 0,
            threshold: 3,
            status: 'out'
        },
        {
            id: '3',
            name: 'USB-C Hub',
            image: 'https://images.unsplash.com/photo-1616410011236-7a4211f90103?w=100&q=80',
            stock: 4,
            threshold: 10,
            status: 'low'
        }
    ];

    const data = items || mockItems;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <FaExclamationTriangle className="text-orange-500" />
                    <h3 className="text-lg font-bold text-gray-900">Inventory Alerts</h3>
                </div>
                <Link href="/seller/inventory" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                    Manage <FaArrowRight className="text-xs" />
                </Link>
            </div>

            <div className="divide-y divide-gray-100">
                {data.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                            <FaBoxOpen className="text-green-500 text-xl" />
                        </div>
                        <p>Inventory looks good!</p>
                    </div>
                ) : (
                    data.map((item) => (
                        <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition">
                            {/* Image */}
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                                <Image
                                    src={item.image}
                                    alt={item.name}
                                    fill
                                    className="object-cover"
                                />
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900 truncate">{item.name}</h4>
                                <p className="text-xs text-gray-500">
                                    Threshold: {item.threshold} units
                                </p>
                            </div>

                            {/* Status */}
                            <div className="text-right">
                                <span className={`
                  inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                  ${item.status === 'out'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-orange-100 text-orange-800'
                                    }
                `}>
                                    {item.status === 'out' ? 'Out of Stock' : `${item.stock} left`}
                                </span>
                                {item.status !== 'out' && (
                                    <button className="block mt-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium ml-auto">
                                        Restock
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
