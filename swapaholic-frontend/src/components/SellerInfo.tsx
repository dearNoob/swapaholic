'use client';

import Image from 'next/image';
import { FaStar, FaEnvelope, FaUserCircle } from 'react-icons/fa';

interface SellerInfoProps {
    seller: {
        id: string;
        name: string;
        avatar?: string;
        rating: number;
        totalSales: number;
        joinedDate?: string;
    };
}

export default function SellerInfo({ seller }: SellerInfoProps) {
    const renderStars = (rating: number) => {
        return Array.from({ length: 5 }).map((_, index) => (
            <FaStar
                key={index}
                className={index < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-300'}
            />
        ));
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Seller Information</h3>

            <div className="space-y-4">
                {/* Seller Avatar & Name */}
                <div className="flex items-center gap-4">
                    {seller.avatar ? (
                        <div className="relative w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                            <Image
                                src={seller.avatar}
                                alt={seller.name}
                                fill
                                className="object-cover"
                            />
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <FaUserCircle className="text-4xl text-indigo-600" />
                        </div>
                    )}
                    <div className="flex-1">
                        <h4 className="text-xl font-semibold text-gray-900">{seller.name}</h4>
                        <div className="flex items-center gap-1 mt-1">
                            {renderStars(seller.rating)}
                            <span className="ml-2 text-sm text-gray-600">
                                {seller.rating.toFixed(1)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                        <p className="text-sm text-gray-600">Total Sales</p>
                        <p className="text-2xl font-bold text-indigo-600">{seller.totalSales}</p>
                    </div>
                    {seller.joinedDate && (
                        <div>
                            <p className="text-sm text-gray-600">Member Since</p>
                            <p className="text-lg font-semibold text-gray-900">
                                {new Date(seller.joinedDate).getFullYear()}
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="space-y-2 pt-4 border-t">
                    <button className="w-full bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                        <FaEnvelope />
                        Contact Seller
                    </button>
                    <button className="w-full border border-indigo-600 text-indigo-600 py-3 rounded-lg font-medium hover:bg-indigo-50 transition">
                        View Profile
                    </button>
                </div>

                {/* Trust Indicators */}
                <div className="pt-4 border-t">
                    <p className="text-xs text-gray-600 mb-2 font-medium">Verified Seller</p>
                    <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            ✓ Email Verified
                        </span>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            ✓ ID Verified
                        </span>
                        {seller.totalSales > 10 && (
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                                ⭐ Top Seller
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
