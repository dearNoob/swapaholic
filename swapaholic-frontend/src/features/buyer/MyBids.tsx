import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { FaTrophy, FaClock, FaHeart, FaDollarSign, FaCheck, FaTimes, FaExclamationTriangle, FaBell } from 'react-icons/fa';
import { bidsApi, WonBid } from '../../api/bids';
import { Button } from '../../components/ui/Button';

interface Bid {
    id: string;
    productId: string;
    productTitle: string;
    productImage: string;
    bidAmount: number;
    currentBid: number;
    isLeading: boolean;
    auctionEndTime: string;
    auctionStatus: 'active' | 'ended';
    bidPlacedAt: string;
}

interface WonAuction {
    id: string;
    productId: string;
    productTitle: string;
    productImage: string;
    finalBid: number;
    wonAt: string;
    paymentStatus: 'pending' | 'paid' | 'completed';
    deliveryStatus?: 'pending' | 'shipped' | 'delivered';
}

export const MyBids = () => {
    const [bids, setBids] = useState<Bid[]>([]);
    const [wonAuctions, setWonAuctions] = useState<WonAuction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'active' | 'won' | 'history'>('active');
    const [pendingConfirmations, setPendingConfirmations] = useState<number>(0);

    useEffect(() => {
        fetchUserBids();
        fetchPendingConfirmations();
    }, []);

    const fetchPendingConfirmations = async () => {
        try {
            const wonBids = await bidsApi.getWonBids();
            setPendingConfirmations(wonBids.filter(b => !b.isExpired).length);
        } catch (e) {
            // silently fail — won bids banner is supplementary
        }
    };

    const fetchUserBids = async () => {
        try {
            setIsLoading(true);
            const data = await bidsApi.getUserBids();

            // Handle response structure
            const allBids = Array.isArray(data) ? data : (data.data || []);

            // Separate active bids and won auctions
            // Include 'bidden' products in active list
            const active = allBids.filter((bid: any) => 
                bid.product && (bid.product.status === 'active' || bid.product.status === 'bidden')
            );
            const won = allBids.filter((bid: any) => 
                bid.product && bid.product.status === 'sold' && bid.isWinning
            );

            setBids(active.map((b: any) => ({
                id: b.id,
                productId: b.product?.id,
                productTitle: b.product?.title,
                productImage: b.product?.images?.[0] || '/placeholder.png',
                bidAmount: b.amount,
                currentBid: b.product?.currentBid || b.product?.basePrice,
                isLeading: b.isWinning,
                auctionEndTime: (b.product as any).endTime || new Date(Date.now() + 86400000).toISOString(),
                auctionStatus: b.product?.status,
                bidPlacedAt: b.createdAt
            })));
            
            setWonAuctions(won.map((b: any) => ({
                id: b.id,
                productId: b.product?.id,
                productTitle: b.product?.title,
                productImage: b.product?.images?.[0] || '/placeholder.png',
                finalBid: b.amount,
                wonAt: b.product?.endTime || b.createdAt,
                paymentStatus: 'pending', // Defaulting to pending, ideally should come from order
                deliveryStatus: 'pending'
            })));
        } catch (error) {
            console.error('Error fetching bids:', error);
            // Use mock data for demonstration
            const mockBids: Bid[] = [
                {
                    id: '1',
                    productId: 'prod-1',
                    productTitle: 'Vintage Canon AE-1 Camera',
                    productImage: 'https://via.placeholder.com/150',
                    bidAmount: 150.00,
                    currentBid: 175.00,
                    isLeading: false,
                    auctionEndTime: new Date(Date.now() + 3600000 * 24).toISOString(),
                    auctionStatus: 'active',
                    bidPlacedAt: new Date(Date.now() - 3600000).toISOString(),
                },
                {
                    id: '2',
                    productId: 'prod-2',
                    productTitle: 'Apple MacBook Pro 2019',
                    productImage: 'https://via.placeholder.com/150',
                    bidAmount: 800.00,
                    currentBid: 800.00,
                    isLeading: true,
                    auctionEndTime: new Date(Date.now() + 3600000 * 48).toISOString(),
                    auctionStatus: 'active',
                    bidPlacedAt: new Date(Date.now() - 7200000).toISOString(),
                },
            ];

            const mockWon: WonAuction[] = [
                {
                    id: 'won-1',
                    productId: 'prod-3',
                    productTitle: 'Sony PlayStation 5',
                    productImage: 'https://via.placeholder.com/150',
                    finalBid: 450.00,
                    wonAt: new Date(Date.now() - 86400000).toISOString(),
                    paymentStatus: 'pending',
                },
                {
                    id: 'won-2',
                    productId: 'prod-4',
                    productTitle: 'Nike Air Jordan 1 Retro',
                    productImage: 'https://via.placeholder.com/150',
                    finalBid: 220.00,
                    wonAt: new Date(Date.now() - 86400000 * 3).toISOString(),
                    paymentStatus: 'paid',
                    deliveryStatus: 'shipped',
                },
            ];

            setBids(mockBids);
            setWonAuctions(mockWon);
        } finally {
            setIsLoading(false);
        }
    };

    const getTimeRemaining = (endTime: string) => {
        const now = new Date().getTime();
        const end = new Date(endTime).getTime();
        const diff = end - now;

        if (diff <= 0) return 'Ended';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    const getPaymentStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <FaExclamationTriangle className="mr-1" /> Payment Pending
                </span>;
            case 'paid':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <FaCheck className="mr-1" /> Paid
                </span>;
            case 'completed':
                return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <FaCheck className="mr-1" /> Completed
                </span>;
            default:
                return null;
        }
    };

    const renderActiveBids = () => {
        if (bids.length === 0) {
            return (
                <div className="text-center py-16">
                    <FaHeart className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Bids</h3>
                    <p className="text-gray-500 mb-6">You haven't placed any bids yet.</p>
                    <Link href="/products">
                        <Button>Browse Products</Button>
                    </Link>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bids.map((bid) => (
                    <div key={bid.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-200">
                        <div className="relative">
                            <img src={bid.productImage} alt={bid.productTitle} className="w-full h-48 object-cover" />
                            {bid.isLeading ? (
                                <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                    <FaTrophy /> Leading
                                </div>
                            ) : (
                                <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                    <FaTimes /> Outbid
                                </div>
                            )}
                        </div>
                        <div className="p-4">
                            <Link href={`/products/${bid.productId}`}>
                                <h3 className="text-lg font-semibold text-gray-900 hover:text-indigo-600 transition-colors mb-2 line-clamp-2">
                                    {bid.productTitle}
                                </h3>
                            </Link>

                            <div className="space-y-2 mb-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">Your Bid</span>
                                    <span className="text-lg font-bold text-indigo-600">৳{bid.bidAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">Current Bid</span>
                                    <span className={`text-lg font-bold ${bid.isLeading ? 'text-green-600' : 'text-red-600'}`}>
                                        ৳{bid.currentBid.toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                    <FaClock className="text-orange-500" />
                                    <span>{getTimeRemaining(bid.auctionEndTime)}</span>
                                </div>
                                <Link href={`/products/${bid.productId}`}>
                                    <Button size="sm" variant="outline">View Auction</Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderWonAuctions = () => {
        if (wonAuctions.length === 0) {
            return (
                <div className="text-center py-16">
                    <FaTrophy className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Won Auctions</h3>
                    <p className="text-gray-500 mb-6">You haven't won any auctions yet.</p>
                    <Link href="/products">
                        <Button>Start Bidding</Button>
                    </Link>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {wonAuctions.map((auction) => (
                    <div key={auction.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-gray-200">
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <img src={auction.productImage} alt={auction.productTitle} className="w-24 h-24 object-cover rounded-lg border border-gray-200" />
                                <div className="flex-1">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <Link href={`/products/${auction.productId}`}>
                                                <h3 className="text-xl font-semibold text-gray-900 hover:text-indigo-600 transition-colors mb-1">
                                                    {auction.productTitle}
                                                </h3>
                                            </Link>
                                            <p className="text-sm text-gray-500">
                                                Won on {new Date(auction.wonAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-green-600 mb-1">
                                                ${auction.finalBid.toFixed(2)}
                                            </div>
                                            <span className="text-xs text-gray-500">Final Bid</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 mt-4">
                                        {getPaymentStatusBadge(auction.paymentStatus)}
                                        {auction.deliveryStatus && (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 capitalize">
                                                {auction.deliveryStatus}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex gap-2 mt-4">
                                        {auction.paymentStatus === 'pending' && (
                                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                                <FaDollarSign className="mr-1" /> Pay Now
                                            </Button>
                                        )}
                                        <Link href={`/products/${auction.productId}`}>
                                            <Button size="sm" variant="outline">View Details</Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderBidHistory = () => {
        const allHistory = [...bids, ...wonAuctions].sort((a, b) => {
            const dateA = 'wonAt' in a ? new Date(a.wonAt).getTime() : new Date(a.bidPlacedAt).getTime();
            const dateB = 'wonAt' in b ? new Date(b.wonAt).getTime() : new Date(b.bidPlacedAt).getTime();
            return dateB - dateA;
        });

        if (allHistory.length === 0) {
            return (
                <div className="text-center py-16">
                    <p className="text-gray-500">No bid history available</p>
                </div>
            );
        }

        return (
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bid Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {allHistory.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <img className="h-10 w-10 rounded object-cover" src={item.productImage} alt="" />
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900">{item.productTitle}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-semibold text-gray-900">
                                        ৳{'finalBid' in item ? item.finalBid.toFixed(2) : item.bidAmount.toFixed(2)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {'wonAt' in item ? (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                            Won
                                        </span>
                                    ) : item.isLeading ? (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                            Leading
                                        </span>
                                    ) : (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                            Outbid
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date('wonAt' in item ? item.wonAt : item.bidPlacedAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <Link href={`/products/${item.productId}`} className="text-indigo-600 hover:text-indigo-900">
                                        View
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">My Bids</h1>
                    <p className="mt-2 text-lg text-gray-600">Track your bidding activity and manage won auctions</p>
                </div>

                {/* Pending Confirmations Banner */}
                {pendingConfirmations > 0 && (
                    <Link href="/my-bids/won">
                        <div className="mb-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-xl p-5 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="bg-white/20 backdrop-blur rounded-full p-3">
                                            <FaTrophy className="text-2xl text-yellow-300" />
                                        </div>
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                                            {pendingConfirmations}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="text-white text-lg font-bold">🎉 You have {pendingConfirmations} auction{pendingConfirmations > 1 ? 's' : ''} to confirm!</h3>
                                        <p className="text-indigo-200 text-sm mt-0.5">Confirm within 3 hours to secure your purchase. Not confirming will reduce your buyer rating.</p>
                                    </div>
                                </div>
                                <div className="flex-shrink-0">
                                    <span className="bg-white text-indigo-700 font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-indigo-50 transition-colors">
                                        Confirm Now →
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Link>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Active Bids</p>
                                <p className="text-3xl font-bold text-gray-900">{bids.length}</p>
                            </div>
                            <FaClock className="text-4xl text-blue-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Won Auctions</p>
                                <p className="text-3xl font-bold text-gray-900">{wonAuctions.length}</p>
                            </div>
                            <FaTrophy className="text-4xl text-green-500" />
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Leading Bids</p>
                                <p className="text-3xl font-bold text-gray-900">{bids.filter(b => b.isLeading).length}</p>
                            </div>
                            <FaTrophy className="text-4xl text-indigo-500" />
                        </div>
                    </div>
                    {pendingConfirmations > 0 && (
                        <Link href="/my-bids/won">
                            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500 cursor-pointer hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600">Pending Confirmations</p>
                                        <p className="text-3xl font-bold text-yellow-600">{pendingConfirmations}</p>
                                    </div>
                                    <div className="relative">
                                        <FaBell className="text-4xl text-yellow-500" />
                                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
                                            !
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    )}
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`${activeTab === 'active'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Active Bids ({bids.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('won')}
                            className={`${activeTab === 'won'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Won Auctions ({wonAuctions.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`${activeTab === 'history'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Complete History
                        </button>
                    </nav>
                </div>

                {/* Content */}
                {isLoading ? (
                    <div className="text-center py-16">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                        <p className="mt-4 text-gray-500">Loading your bids...</p>
                    </div>
                ) : (
                    <>
                        {activeTab === 'active' && renderActiveBids()}
                        {activeTab === 'won' && renderWonAuctions()}
                        {activeTab === 'history' && renderBidHistory()}
                    </>
                )}
            </div>
        </div>
    );
};
