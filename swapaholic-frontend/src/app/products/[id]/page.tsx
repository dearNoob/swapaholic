'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaHome, FaChevronRight, FaShare, FaFlag, FaCheckCircle, FaClock } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { productsApi, Product } from '../../../api/products';
import { bidsApi, Bid } from '../../../api/bids';
import { messagesApi } from '../../../api/messages';
import { useAuth } from '../../../hooks/useAuth';
import { socketService } from '../../../utils/socket';
import ImageCarousel from '../../../components/ImageCarousel';
import BiddingInterface from '../../../components/BiddingInterface';
import BidHistory from '../../../components/BidHistory';
import SellerInfo from '../../../components/SellerInfo';
import { ReviewList } from '../../../components/reviews/ReviewList';

interface SellerSummary {
    _id?: string;
    firstName?: string;
    lastName?: string;
    profilePicture?: string;
    ratingAverage?: number;
    totalTransactions?: number;
    createdAt?: string;
}

interface ProductPageProduct extends Omit<Product, 'sellerId'> {
    basePrice?: number;
    highestBidAmount?: number;
    bidEndDate?: string;
    sellerId: string | SellerSummary;
}

interface ProductBid extends Bid {
    _id?: string;
    bidAmount?: number;
    buyerId?: {
        firstName?: string;
        lastName?: string;
    };
}

interface BidPlacedEvent {
    productId: string;
    bid: ProductBid;
}

interface RecentlyViewedProduct {
    id: string;
    title: string;
    image: string;
    price: number;
    currentBid: number;
    auctionEndTime?: string;
    condition: string;
}

const getSellerId = (seller: ProductPageProduct['sellerId']): string =>
    typeof seller === 'string' ? seller : seller._id ?? '';

const getSellerName = (product: ProductPageProduct): string => {
    if (typeof product.sellerId === 'string') {
        return product.sellerName || 'Seller Name';
    }

    const firstName = product.sellerId.firstName ?? '';
    const lastName = product.sellerId.lastName ?? '';
    return `${firstName} ${lastName}`.trim() || product.sellerName || 'Seller Name';
};

const getStartingPrice = (product: ProductPageProduct): number => product.price || product.basePrice || 0;
const getCurrentBidValue = (product: ProductPageProduct): number => product.currentBid || product.highestBidAmount || getStartingPrice(product);
const getAuctionEndTime = (product: ProductPageProduct): string | undefined => product.auctionEndTime || product.bidEndDate;

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;

    const [product, setProduct] = useState<ProductPageProduct | null>(null);
    const [bids, setBids] = useState<ProductBid[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProductData = useCallback(async () => {
        try {
            const [productData, bidData] = await Promise.all([
                productsApi.getProductById(productId) as Promise<ProductPageProduct>,
                bidsApi.getProductBids(productId).catch(() => [] as ProductBid[])
            ]);

            setProduct(productData);
            setBids(bidData);

            try {
                const recentStr = localStorage.getItem('swapaholic_recently_viewed');
                const parsedRecent = recentStr ? JSON.parse(recentStr) : [];
                let recent: RecentlyViewedProduct[] = Array.isArray(parsedRecent) ? parsedRecent : [];

                recent = recent.filter((recentProduct) => recentProduct.id !== productData.id);
                recent.unshift({
                    id: productData.id,
                    title: productData.title,
                    image: productData.images?.[0] || '',
                    price: productData.price,
                    currentBid: getCurrentBidValue(productData),
                    auctionEndTime: getAuctionEndTime(productData),
                    condition: productData.condition
                });
                recent = recent.slice(0, 10);

                localStorage.setItem('swapaholic_recently_viewed', JSON.stringify(recent));
            } catch (storageError) {
                console.error('Could not save to recently viewed', storageError);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load product');
        } finally {
            setIsLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        if (!productId) {
            return;
        }

        fetchProductData();

        const handleBidPlaced = (data: BidPlacedEvent) => {
            if (data.productId !== productId) {
                return;
            }

            setBids((prev) => [data.bid, ...prev]);
            setProduct((prev) => {
                if (!prev) {
                    return null;
                }

                return {
                    ...prev,
                    currentBid: data.bid.amount,
                    bidCount: (prev.bidCount || 0) + 1
                };
            });
        };

        socketService.on('bid_placed', handleBidPlaced);

        return () => {
            socketService.off('bid_placed');
        };
    }, [productId, fetchProductData]);

    const handleBidPlaced = () => {
        fetchProductData();
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: product?.title,
                text: product?.description,
                url: window.location.href,
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            toast.success('Link copied to clipboard!');
        }
    };

    const { user, isAuthenticated } = useAuth();

    const handleMessageSeller = async () => {
        if (!isAuthenticated) {
            router.push(`/login?redirect=/products/${productId}`);
            return;
        }

        if (!product || !product.sellerId) {
            return;
        }

        const sellerId = getSellerId(product.sellerId);

        if (user?.id === sellerId) {
            toast.warning('You cannot message yourself!');
            return;
        }

        try {
            const response = await messagesApi.startConversation(sellerId);
            const conversationId = response.conversationId;

            if (conversationId) {
                router.push(`/messages?conversationId=${conversationId}`);
            } else {
                router.push('/messages');
            }
        } catch (conversationError) {
            console.error('Failed to start conversation:', conversationError);
            toast.error('Failed to start conversation. Please try again.');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="animate-pulse">
                        <div className="h-8 bg-gray-200 rounded w-1/4 mb-8" />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="h-96 bg-gray-200 rounded-lg" />
                            <div className="space-y-4">
                                <div className="h-12 bg-gray-200 rounded" />
                                <div className="h-32 bg-gray-200 rounded" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !product) {
        return (
            <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Product Not Found</h1>
                    <p className="text-gray-600 mb-6">{error || 'The product you are looking for does not exist.'}</p>
                    <button
                        onClick={() => router.push('/products')}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                        Back to Products
                    </button>
                </div>
            </div>
        );
    }

    const getConditionColor = (condition: string) => {
        switch (condition?.toLowerCase()) {
            case 'new':
                return 'bg-green-100 text-green-800';
            case 'like new':
                return 'bg-blue-100 text-blue-800';
            case 'good':
                return 'bg-yellow-100 text-yellow-800';
            case 'fair':
                return 'bg-orange-100 text-orange-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <nav className="flex items-center gap-2 text-sm mb-6">
                    <Link href="/" className="text-gray-600 hover:text-indigo-600 transition">
                        <FaHome />
                    </Link>
                    <FaChevronRight className="text-gray-400 text-xs" />
                    <Link href="/products" className="text-gray-600 hover:text-indigo-600 transition">
                        Products
                    </Link>
                    <FaChevronRight className="text-gray-400 text-xs" />
                    <Link href={`/products?category=${product.category}`} className="text-gray-600 hover:text-indigo-600 transition">
                        {product.category}
                    </Link>
                    <FaChevronRight className="text-gray-400 text-xs" />
                    <span className="text-gray-900 font-medium truncate">{product.title}</span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    <div className="lg:col-span-2 space-y-8">
                        <ImageCarousel
                            images={product.images || ['/products/placeholder.png']}
                            productTitle={product.title}
                        />

                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.title}</h1>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getConditionColor(product.condition)}`}>
                                            {product.condition}
                                        </span>
                                        {product.status === 'active' && (
                                            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold flex items-center gap-1">
                                                <FaCheckCircle /> Verified
                                            </span>
                                        )}
                                        <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm">
                                            {product.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleShare}
                                        className="p-3 rounded-full border border-gray-300 hover:bg-gray-50 transition"
                                        aria-label="Share"
                                    >
                                        <FaShare className="text-gray-600" />
                                    </button>
                                    <button
                                        className="p-3 rounded-full border border-gray-300 hover:bg-gray-50 transition"
                                        aria-label="Report"
                                    >
                                        <FaFlag className="text-gray-600" />
                                    </button>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                                <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-6 border-t">
                                <div>
                                    <p className="text-sm text-gray-600">Condition</p>
                                    <p className="text-lg font-semibold text-gray-900">{product.condition}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Category</p>
                                    <p className="text-lg font-semibold text-gray-900">{product.category}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600">Starting Price</p>
                                    <p className="text-lg font-semibold text-gray-900">৳{getStartingPrice(product)}</p>
                                </div>
                                {getAuctionEndTime(product) && (
                                    <div>
                                        <p className="text-sm text-gray-600">Auction Ends</p>
                                        <p className="text-lg font-semibold text-gray-900 flex items-center gap-1">
                                            <FaClock className="text-orange-500" />
                                            {new Date(getAuctionEndTime(product)!).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <BidHistory bids={(bids || []).map((bid) => ({
                            id: bid.id || bid._id || `${bid.createdAt}-${bid.amount || bid.bidAmount || 0}`,
                            bidderName: bid.username || (bid.buyerId ? `${bid.buyerId.firstName || ''} ${bid.buyerId.lastName || ''}`.trim() : 'Anonymous Buyer'),
                            amount: bid.amount || bid.bidAmount || 0,
                            timestamp: bid.createdAt,
                            isCurrentUser: false
                        }))} maxDisplay={5} />
                    </div>

                    <div className="space-y-6">
                        <BiddingInterface
                            productId={productId}
                            currentBid={getCurrentBidValue(product)}
                            startingPrice={getStartingPrice(product)}
                            minimumIncrement={5}
                            endTime={getAuctionEndTime(product)}
                            totalBids={bids.length}
                            productName={product.title}
                            sellerId={getSellerId(product.sellerId) || '1'}
                            onBidPlaced={handleBidPlaced}
                        />

                        <SellerInfo
                            seller={{
                                id: getSellerId(product.sellerId) || '1',
                                name: getSellerName(product),
                                avatar: typeof product.sellerId === 'string' ? undefined : product.sellerId.profilePicture,
                                rating: typeof product.sellerId === 'string' ? 0 : product.sellerId.ratingAverage || 0,
                                totalSales: typeof product.sellerId === 'string' ? 0 : product.sellerId.totalTransactions || 0,
                                joinedDate: typeof product.sellerId === 'string' ? '2023-01-01' : product.sellerId.createdAt || '2023-01-01',
                            }}
                            onContactSeller={handleMessageSeller}
                        />
                    </div>
                </div>

                <div className="mt-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
                    <ReviewList sellerId={getSellerId(product.sellerId)} />
                </div>
            </div>
        </div>
    );
}
