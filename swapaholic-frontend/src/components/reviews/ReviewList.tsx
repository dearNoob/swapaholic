import React, { useState, useEffect } from 'react';
import { FaThumbsUp, FaUser } from 'react-icons/fa';
import { reviewsApi, Review } from '../../api/reviews';
import { RatingStars } from '../ui/RatingStars';
import { toast } from 'react-toastify';
import { formatRelativeTime } from '../../utils/time';

interface ReviewListProps {
    sellerId: string;
    showProductName?: boolean;
}

export const ReviewList: React.FC<ReviewListProps> = ({ sellerId, showProductName = false }) => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent');

    useEffect(() => {
        if (sellerId) fetchReviews();
    }, [sellerId]);

    const fetchReviews = async () => {
        try {
            setIsLoading(true);
            const data = await reviewsApi.getSellerReviews(sellerId);
            
            // Map backend schema to Review UI representation
            const rawReviews = Array.isArray(data) ? data : (data.reviews || []);
            const mappedReviews = rawReviews.map((r: any) => ({
                id: r._id || r.id,
                productId: r.orderId?._id || 'unknown',
                sellerId: r.revieweeId || sellerId,
                buyerId: r.reviewerId?._id || 'unknown',
                buyerName: r.reviewerId ? `${r.reviewerId.firstName || ''} ${r.reviewerId.lastName || ''}`.trim() : 'Anonymous Buyer',
                buyerAvatar: undefined,
                rating: r.rating || 0,
                comment: r.comment || '',
                createdAt: r.createdAt,
                helpful: r.reportCount || 0, // Fallback property
                response: undefined // Responses not handled yet in backend schema
            }));
            
            setReviews(mappedReviews);
        } catch (error) {
            console.error('Error fetching reviews:', error);
            setReviews([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkHelpful = async (reviewId: string) => {
        try {
            await reviewsApi.markHelpful(reviewId);
            setReviews((prev) =>
                prev.map((review) =>
                    review.id === reviewId ? { ...review, helpful: review.helpful + 1 } : review
                )
            );
            toast.success('Marked as helpful');
        } catch (error) {
            console.error('Error marking as helpful:', error);
            // Update locally even if API fails
            setReviews((prev) =>
                prev.map((review) =>
                    review.id === reviewId ? { ...review, helpful: review.helpful + 1 } : review
                )
            );
        }
    };

    const sortedReviews = [...reviews].sort((a, b) => {
        switch (sortBy) {
            case 'recent':
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case 'helpful':
                return b.helpful - a.helpful;
            case 'rating':
                return b.rating - a.rating;
            default:
                return 0;
        }
    });

    const averageRating = reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 0;

    const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => ({
        stars,
        count: reviews.filter((r) => r.rating === stars).length,
        percentage: reviews.length > 0 ? (reviews.filter((r) => r.rating === stars).length / reviews.length) * 100 : 0,
    }));

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Rating Summary */}
            <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Customer Reviews</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Overall Rating */}
                    <div className="text-center md:text-left">
                        <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
                            <span className="text-5xl font-bold text-gray-900">{averageRating.toFixed(1)}</span>
                            <div>
                                <RatingStars rating={averageRating} size="lg" showNumber={false} />
                                <p className="text-sm text-gray-600 mt-1">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                    </div>

                    {/* Rating Distribution */}
                    <div className="space-y-2">
                        {ratingDistribution.map(({ stars, count, percentage }) => (
                            <div key={stars} className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 w-12">{stars} star{stars !== 1 ? 's' : ''}</span>
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-yellow-400 transition-all"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <span className="text-sm text-gray-600 w-8">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Sort Options */}
            <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">All Reviews ({reviews.length})</h4>
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                    <option value="recent">Most Recent</option>
                    <option value="helpful">Most Helpful</option>
                    <option value="rating">Highest Rating</option>
                </select>
            </div>

            {/* Reviews */}
            {sortedReviews.length === 0 ? (
                <div className="bg-white rounded-lg shadow-md p-12 text-center border border-gray-200">
                    <p className="text-gray-500">No reviews yet. Be the first to review!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {sortedReviews.map((review) => (
                        <div key={review.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                            {/* Reviewer Info */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    {review.buyerAvatar ? (
                                        <img
                                            src={review.buyerAvatar}
                                            alt={review.buyerName}
                                            className="w-12 h-12 rounded-full border-2 border-gray-200"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                                            <FaUser className="text-indigo-600" />
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-semibold text-gray-900">{review.buyerName}</p>
                                        <p className="text-sm text-gray-500">
                                            {formatRelativeTime(review.createdAt)}
                                        </p>
                                    </div>
                                </div>
                                <RatingStars rating={review.rating} size="md" />
                            </div>

                            {/* Review Comment */}
                            <p className="text-gray-700 mb-3 leading-relaxed">{review.comment}</p>

                            {/* Seller Response */}
                            {review.response && (
                                <div className="mt-4 ml-8 p-4 bg-gray-50 rounded-lg border-l-4 border-indigo-500">
                                    <p className="text-sm font-semibold text-gray-900 mb-1">Seller Response:</p>
                                    <p className="text-sm text-gray-700">{review.response.text}</p>
                                    <p className="text-xs text-gray-500 mt-2">
                                        {formatRelativeTime(review.response.createdAt)}
                                    </p>
                                </div>
                            )}

                            {/* Helpful Button */}
                            <div className="mt-4 flex items-center gap-4">
                                <button
                                    onClick={() => handleMarkHelpful(review.id)}
                                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition"
                                >
                                    <FaThumbsUp className="text-xs" />
                                    <span>Helpful ({review.helpful})</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
