import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaStar, FaEdit, FaTrash } from 'react-icons/fa';
import { reviewsApi, Review } from '../../api/reviews';
import { RatingStars } from '../../components/ui/RatingStars';
import { Button } from '../../components/ui/Button';
import Link from 'next/link';

export const MyReviews = () => {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            setIsLoading(true);
            const data = await reviewsApi.getUserReviews();
            const reviewsList = Array.isArray(data) ? data : (data.reviews || []);
            setReviews(reviewsList);
        } catch (error) {
            console.error('Error fetching user reviews:', error);
            // Mock data for demonstration
            setReviews([
                {
                    id: '1',
                    productId: 'prod-1',
                    sellerId: 'seller-1',
                    buyerId: 'me',
                    buyerName: 'You',
                    rating: 5,
                    comment: 'Excellent product! Exactly as described. The seller was very responsive and shipped quickly.',
                    createdAt: new Date().toISOString(),
                    helpful: 12,
                    response: {
                        text: 'Thank you so much for your kind words! We appreciate your business.',
                        createdAt: new Date(Date.now() - 3600000).toISOString(),
                    },
                },
                {
                    id: '2',
                    productId: 'prod-2',
                    sellerId: 'seller-2',
                    buyerId: 'me',
                    buyerName: 'You',
                    rating: 4,
                    comment: 'Good quality. Minor wear and tear but overall satisfied with the purchase.',
                    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
                    helpful: 5,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (reviewId: string) => {
        if (!window.confirm('Are you sure you want to delete this review?')) return;

        try {
            await reviewsApi.delete(reviewId);
            setReviews((prev) => prev.filter((r) => r.id !== reviewId));
            toast.success('Review deleted successfully');
        } catch (error) {
            console.error('Error deleting review:', error);
            toast.error('Failed to delete review');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">My Reviews</h1>
                    <p className="mt-2 text-lg text-gray-600">
                        Reviews you've written for products and sellers
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
                        <p className="text-sm font-medium text-gray-600">Total Reviews</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{reviews.length}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
                        <p className="text-sm font-medium text-gray-600">Average Rating</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                            {reviews.length > 0
                                ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
                                : '0.0'}
                        </p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
                        <p className="text-sm font-medium text-gray-600">Helpful Votes</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                            {reviews.reduce((sum, r) => sum + r.helpful, 0)}
                        </p>
                    </div>
                </div>

                {/* Reviews List */}
                {isLoading ? (
                    <div className="text-center py-16">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                        <p className="mt-4 text-gray-500">Loading your reviews...</p>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <FaStar className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Reviews Yet</h3>
                        <p className="text-gray-500 mb-6">You haven't written any reviews yet</p>
                        <Link href="/my-bids">
                            <Button>View Your Purchases</Button>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reviews.map((review) => (
                            <div key={review.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <Link href={`/products/${review.productId}`}>
                                            <Button variant="outline" size="sm">
                                                View Product
                                            </Button>
                                        </Link>
                                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                            Product Review
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {new Date(review.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            className="p-2 text-gray-400 hover:text-red-600 transition"
                                            onClick={() => handleDelete(review.id)}
                                            title="Delete Review"
                                        >
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>

                                {/* Rating */}
                                <div className="mb-3">
                                    <RatingStars rating={review.rating} size="lg" />
                                </div>

                                {/* Comment */}
                                <p className="text-gray-700 mb-4 leading-relaxed">{review.comment}</p>

                                {/* Seller Response */}
                                {review.response && (
                                    <div className="mt-4 p-4 bg-indigo-50 rounded-lg border-l-4 border-indigo-500">
                                        <p className="text-sm font-semibold text-indigo-900 mb-1">
                                            Seller Response:
                                        </p>
                                        <p className="text-sm text-gray-700">{review.response.text}</p>
                                        <p className="text-xs text-gray-500 mt-2">
                                            {new Date(review.response.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                )}

                                {/* Stats */}
                                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                                    <span className="text-sm text-gray-600">
                                        {review.helpful} people found this helpful
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
