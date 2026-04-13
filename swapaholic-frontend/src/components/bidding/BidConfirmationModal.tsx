'use client';

import React, { useState } from 'react';
import { FaGavel, FaTimes, FaExclamationTriangle } from 'react-icons/fa';

interface BidConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    bidAmount: number;
    currentBid: number;
    productName: string;
    productImage?: string;
    minBid: number;
}

export default function BidConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    bidAmount,
    currentBid,
    productName,
    productImage,
    minBid
}: BidConfirmationModalProps) {
    const [isConfirming, setIsConfirming] = useState(false);

    if (!isOpen) return null;

    const handleConfirm = async () => {
        setIsConfirming(true);
        await onConfirm();
        setIsConfirming(false);
    };

    const isValidBid = bidAmount >= minBid;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                {/* Header */}
                <div className="border-b p-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <FaGavel className="text-indigo-600" />
                            Confirm Your Bid
                        </h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 p-2"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Product Info */}
                    <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                        {productImage && (
                            <img
                                src={productImage}
                                alt={productName}
                                className="w-16 h-16 object-cover rounded-lg"
                            />
                        )}
                        <div>
                            <h4 className="font-semibold text-gray-900">{productName}</h4>
                            <p className="text-sm text-gray-600">Current bid: ৳{currentBid}</p>
                        </div>
                    </div>

                    {/* Bid Details */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Your bid amount:</span>
                            <span className="text-2xl font-bold text-gray-900">৳{bidAmount}</span>
                        </div>

                        {!isValidBid && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
                                <FaExclamationTriangle className="text-red-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-red-800">
                                    <p className="font-semibold">Invalid Bid Amount</p>
                                    <p>Minimum bid must be at least ৳{minBid.toFixed(2)}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Warning */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-sm text-yellow-900">
                            <span className="font-semibold">Important:</span> By placing this bid, you agree to purchase this item if you win the auction. Bids cannot be retracted once placed.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t p-6 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!isValidBid || isConfirming}
                        className="
              flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg font-semibold
              hover:bg-indigo-700 transition
              disabled:opacity-50 disabled:cursor-not-allowed
            "
                    >
                        {isConfirming ? 'Placing Bid...' : 'Confirm Bid'}
                    </button>
                </div>
            </div>
        </div>
    );
}
