'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { FaHome, FaChevronRight, FaShare, FaFlag, FaCheckCircle, FaClock } from 'react-icons/fa';
import { productsApi, Product } from '../../../api/products';
import { bidsApi, Bid } from '../../../api/bids';

interface BidPlacedEvent {
    productId: string;
    bid: Bid;
}
import { socketService } from '../../../utils/socket';
import ImageCarousel from '../../../components/ImageCarousel';
import BiddingInterface from '../../../components/BiddingInterface';
import BidHistory from '../../../components/BidHistory';
import SellerInfo from '../../../components/SellerInfo';
import { ReviewList } from '../../../components/reviews/ReviewList';
import { ReviewForm } from '../../../components/reviews/ReviewForm';

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;

    const [product, setProduct] = useState<Product | null>(null);
    const [bids, setBids] = useState<Bid[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProductData = useCallback(async () => {
        try {
            const [productData, bidData] = await Promise.all([
                productsApi.getProductById(productId),
                bidsApi.getProductBids(productId)
            ]);

            setProduct(productData);
            setBids(bidData);

            // Fetch similar products if category is available
            if (productData.category) {
                // const similarData = await productsApi.getSimilar(productData.category);
                // setSimilarProducts(similarData);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load product');
        } finally {
            setIsLoading(false);
        }
    }, [productId]);

    useEffect(() => {
        if (productId) {
            fetchProductData();

            // Socket listeners
            socketService.on('bid_placed', (data: BidPlacedEvent) => {
                if (data.productId === productId) {
                    setBids(prev => [data.bid, ...prev]);
                    setProduct((prev: Product | null) => {
                        if (!prev) return null;
                        return {
                            ...prev,
                            currentBid: data.bid.amount,
                            bidCount: (prev.bidCount || 0) + 1
                        };
                    });
                }
            });

            return () => {
                socketService.off('bid_placed');
            };
        }
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
            alert('Link copied to clipboard!');
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
                {/* Breadcrumb */}
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

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    {/* Left Column - Images & Details */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Image Carousel */}
                        <ImageCarousel
                            images={product.images || ['/products/placeholder.png']}
                            productTitle={product.title}
                        />

                        {/* Product Info Card */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            {/* Title & Actions */}
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

                            {/* Description */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                                <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
                            </div>

                            {/* Specifications */}
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
                                    <p className="text-lg font-semibold text-gray-900">৳{product.price}</p>
                                </div>
                                {product.auctionEndTime && (
                                    <div>
                                        <p className="text-sm text-gray-600">Auction Ends</p>
                                        <p className="text-lg font-semibold text-gray-900 flex items-center gap-1">
                                            <FaClock className="text-orange-500" />
                                            {new Date(product.auctionEndTime!).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Bid History */}
                        <BidHistory bids={bids.map(bid => ({
                            id: bid.id,
                            bidderName: bid.username,
                            amount: bid.amount,
                            timestamp: bid.createdAt,
                            isCurrentUser: false // TODO: determine if current user
                        }))} maxDisplay={5} />
                    </div>

                    {/* Right Column - Bidding & Seller */}
                    <div className="space-y-6">
                        {/* Bidding Interface */}
                        <BiddingInterface
                            productId={productId}
                            currentBid={product.currentBid || 0}
                            startingPrice={product.price}
                            minimumIncrement={5}
                            endTime={product.auctionEndTime}
                            totalBids={bids.length}
                            productName={product.title}
                            onBidPlaced={handleBidPlaced}
                        />

                        {/* Seller Info */}
                        <SellerInfo
                            seller={{
                                id: product.sellerId || '1',
                                name: product.sellerName || 'Seller Name',
                                avatar: undefined,
                                rating: 4.5,
                                totalSales: 24,
                                joinedDate: '2023-01-01',
                            }}
                        />
                    </div>
                </div>


                {/* Reviews Section */}
                <div className="mt-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>

                    {/* Review List */}
                    <ReviewList productId={productId} />

                    {/* Review Form - Only show if user has purchased */}
                    <div className="mt-8">
                        <ReviewForm
                            productId={productId}
                            sellerId={product?.sellerId || ''}
                            onSuccess={() => {
                                // Refresh reviews after submission
                                window.location.reload();
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
