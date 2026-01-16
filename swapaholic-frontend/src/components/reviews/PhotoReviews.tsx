'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { FaStar, FaCamera, FaTimes, FaThumbsUp, FaReply } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface ReviewFormProps {
    productId: string;
    onSubmit?: (review: ReviewData) => void;
}

interface ReviewData {
    rating: number;
    title: string;
    content: string;
    images: File[];
}

export function ReviewForm({ productId, onSubmit }: ReviewFormProps) {
    const [rating, setRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        if (images.length + files.length > 5) {
            toast.error('Maximum 5 images allowed');
            return;
        }

        const newImages = [...images, ...files];
        setImages(newImages);

        // Create previews
        files.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
        setImagePreviews(imagePreviews.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (rating === 0) {
            toast.error('Please select a rating');
            return;
        }

        const reviewData: ReviewData = {
            rating,
            title,
            content,
            images
        };

        onSubmit?.(reviewData);
        toast.success('Review submitted successfully!');

        // Reset form
        setRating(0);
        setTitle('');
        setContent('');
        setImages([]);
        setImagePreviews([]);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
            <h3 className="text-xl font-bold text-gray-900">Write a Review</h3>

            {/* Star Rating */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Rating *
                </label>
                <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            className="text-3xl transition-colors"
                        >
                            <FaStar
                                className={
                                    star <= (hoverRating || rating)
                                        ? 'text-yellow-400'
                                        : 'text-gray-300'
                                }
                            />
                        </button>
                    ))}
                    <span className="ml-2 text-sm text-gray-600 self-center">
                        {rating > 0 && `${rating} out of 5`}
                    </span>
                </div>
            </div>

            {/* Review Title */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Title *
                </label>
                <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Summarize your experience"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                />
            </div>

            {/* Review Content */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Review *
                </label>
                <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Share your thoughts about this product..."
                    rows={5}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                    required
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 50 characters</p>
            </div>

            {/* Photo Upload */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Add Photos (Optional)
                </label>
                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={() => document.getElementById('review-images')?.click()}
                        className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 transition"
                    >
                        <FaCamera />
                        <span>Upload Photos (Max 5)</span>
                    </button>
                    <input
                        id="review-images"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                    />

                    {/* Image Previews */}
                    {imagePreviews.length > 0 && (
                        <div className="grid grid-cols-3 gap-3">
                            {imagePreviews.map((preview, index) => (
                                <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                                    <Image
                                        src={preview}
                                        alt={`Review image ${index + 1}`}
                                        fill
                                        className="object-cover"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeImage(index)}
                                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                                    >
                                        <FaTimes className="text-xs" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Submit Button */}
            <button
                type="submit"
                disabled={rating === 0 || !title || content.length < 50}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
                Submit Review
            </button>
        </form>
    );
}

interface Review {
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    rating: number;
    title: string;
    content: string;
    images?: string[];
    createdAt: string;
    helpful: number;
    hasVoted?: boolean;
    verified: boolean;
    sellerResponse?: {
        content: string;
        createdAt: string;
    };
}

interface ReviewListProps {
    reviews: Review[];
    onHelpfulClick?: (reviewId: string) => void;
    onReplyClick?: (reviewId: string) => void;
}

export function ReviewList({ reviews, onHelpfulClick, onReplyClick }: ReviewListProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    return (
        <div className="space-y-6">
            {reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-lg border border-gray-200 p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            {review.userAvatar && (
                                <div className="relative w-12 h-12 rounded-full overflow-hidden">
                                    <Image src={review.userAvatar} alt={review.userName} fill className="object-cover" />
                                </div>
                            )}
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-gray-900">{review.userName}</h4>
                                    {review.verified && (
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                            Verified Purchase
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500">
                                    {new Date(review.createdAt).toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                        </div>

                        {/* Rating */}
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <FaStar
                                    key={star}
                                    className={star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <h5 className="font-semibold text-gray-900 mb-2">{review.title}</h5>
                    <p className="text-gray-700 mb-4">{review.content}</p>

                    {/* Images */}
                    {review.images && review.images.length > 0 && (
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            {review.images.map((image, index) => (
                                <button
                                    key={index}
                                    onClick={() => setSelectedImage(image)}
                                    className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition"
                                >
                                    <Image src={image} alt={`Review photo ${index + 1}`} fill className="object-cover" />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Seller Response */}
                    {review.sellerResponse && (
                        <div className="mt-4 ml-8 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <FaReply className="text-indigo-600" />
                                <span className="font-semibold text-indigo-900">Seller Response</span>
                                <span className="text-xs text-gray-500">
                                    {new Date(review.sellerResponse.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-gray-700">{review.sellerResponse.content}</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                        <button
                            onClick={() => onHelpfulClick?.(review.id)}
                            className={`flex items-center gap-2 text-sm transition ${review.hasVoted ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'
                                }`}
                        >
                            <FaThumbsUp />
                            <span>Helpful ({review.helpful})</span>
                        </button>

                        {onReplyClick && (
                            <button
                                onClick={() => onReplyClick(review.id)}
                                className="text-sm text-gray-600 hover:text-indigo-600 transition"
                            >
                                Reply
                            </button>
                        )}
                    </div>
                </div>
            ))}

            {/* Image Lightbox */}
            {selectedImage && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
                    <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-4 right-4 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
                    >
                        <FaTimes className="text-white text-xl" />
                    </button>
                    <div className="relative max-w-4xl max-h-full">
                        <Image
                            src={selectedImage}
                            alt="Review image"
                            width={1200}
                            height={800}
                            className="object-contain"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
