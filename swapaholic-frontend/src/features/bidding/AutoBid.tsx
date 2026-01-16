'use client';

import React, { useState } from 'react';
import { FaRobot, FaInfoCircle, FaCheckCircle, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { bidsApi } from '@/api/bids';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';

interface AutoBidProps {
    productId: string;
    currentBid: number;
    minimumIncrement: number;
    yourCurrentBid?: number;
    onAutoBidSet?: (maxBid: number) => void;
}

export default function AutoBid({
    productId,
    currentBid,
    minimumIncrement,
    yourCurrentBid,
    onAutoBidSet
}: AutoBidProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [maxBid, setMaxBid] = useState<string>('');
    const [isActive, setIsActive] = useState(false);
    const [activeMaxBid, setActiveMaxBid] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const minimumAutoBid = currentBid + minimumIncrement;

    const handleSetAutoBid = async () => {
        const maxBidNumber = parseFloat(maxBid);

        if (isNaN(maxBidNumber)) {
            toast.error('Please enter a valid amount');
            return;
        }

        if (maxBidNumber < minimumAutoBid) {
            toast.error(`Maximum bid must be at least $${minimumAutoBid}`);
            return;
        }

        if (yourCurrentBid && maxBidNumber <= yourCurrentBid) {
            toast.error('Maximum bid must be higher than your current bid');
            return;
        }

        setIsLoading(true);
        try {
            await bidsApi.setAutoBid({
                productId,
                maxAmount: maxBidNumber,
                incrementAmount: minimumIncrement
            });

            setActiveMaxBid(maxBidNumber);
            setIsActive(true);
            setIsOpen(false);
            showSuccessToast(`Auto-bid activated! Maximum bid: $${maxBidNumber}`);
            onAutoBidSet?.(maxBidNumber);
        } catch (error) {
            showErrorToast(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = async () => {
        setIsLoading(true);
        try {
            await bidsApi.cancelAutoBid(productId);
            setIsActive(false);
            setActiveMaxBid(null);
            toast.info('Auto-bid cancelled');
        } catch (error) {
            showErrorToast(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Auto-Bid Status */}
            {isActive && activeMaxBid ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <FaRobot className="text-green-600 text-xl" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-green-900 flex items-center gap-2">
                                    <FaCheckCircle className="text-green-600" />
                                    Auto-Bid Active
                                </h4>
                                <p className="text-sm text-green-700 mt-1">
                                    Maximum bid: <span className="font-bold">09f3{activeMaxBid.toFixed(2)}</span>
                                </p>
                                <p className="text-xs text-green-600 mt-1">
                                    We'll automatically bid up to your maximum when outbid
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={handleCancel}
                            className="text-green-700 hover:text-green-900 p-2"
                            title="Cancel auto-bid"
                        >
                            <FaTimes />
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    disabled={isLoading}
                    className="
            w-full py-3 px-4 border-2 border-indigo-600 text-indigo-600
            rounded-lg font-semibold hover:bg-indigo-50 transition
            flex items-center justify-center gap-2 disabled:opacity-50
          "
                >
                    <FaRobot />
                    Enable Auto-Bid
                </button>
            )}

            {/* Auto-Bid Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        {/* Header */}
                        <div className="border-b p-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    <FaRobot className="text-indigo-600" />
                                    Set Auto-Bid
                                </h3>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-gray-400 hover:text-gray-600 p-2"
                                >
                                    <FaTimes />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6">
                            {/* Info Box */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                                <FaInfoCircle className="text-blue-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-blue-900">
                                    <p className="font-semibold mb-1">How Auto-Bid Works</p>
                                    <ul className="space-y-1 text-blue-800">
                                        <li>• We'll automatically place bids on your behalf</li>
                                        <li>• You'll only bid the minimum needed to stay ahead</li>
                                        <li>• Your maximum bid stays hidden from other bidders</li>
                                        <li>• You can cancel anytime before auction ends</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Current Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-600">Current Bid:</span>
                                    <p className="font-semibold text-gray-900">09f3{currentBid.toFixed(2)}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Minimum Increment:</span>
                                    <p className="font-semibold text-gray-900">${minimumIncrement.toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Max Bid Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Your Maximum Bid
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg font-medium">
                                        $
                                    </span>
                                    <input
                                        type="number"
                                        value={maxBid}
                                        onChange={(e) => setMaxBid(e.target.value)}
                                        min={minimumAutoBid}
                                        step={minimumIncrement}
                                        className="
                      w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg
                      text-lg font-semibold focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                    "
                                        placeholder={minimumAutoBid.toFixed(2)}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Minimum: ${minimumAutoBid.toFixed(2)}
                                </p>
                            </div>

                            {/* Quick Amounts */}
                            <div className="grid grid-cols-3 gap-2">
                                {[10, 25, 50].map((amount) => {
                                    const suggestedBid = currentBid + amount;
                                    return (
                                        <button
                                            key={amount}
                                            onClick={() => setMaxBid(suggestedBid.toString())}
                                            className="
                        py-2 px-3 border border-gray-300 rounded-lg text-sm
                        hover:bg-gray-50 transition
                      "
                                        >
                                            +৳{amount}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t p-6 flex gap-3">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSetAutoBid}
                                disabled={isLoading}
                                className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                            >
                                {isLoading ? 'Activating...' : 'Activate Auto-Bid'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
