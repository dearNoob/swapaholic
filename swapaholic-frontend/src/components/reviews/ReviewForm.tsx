import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { reviewsApi, CreateReviewData } from '../../api/reviews';
import { Button } from '../ui/Button';
import { RatingStars } from '../ui/RatingStars';

const reviewSchema = yup.object({
    rating: yup.number().min(1, 'Please select a rating').max(5).required('Rating is required'),
    comment: yup.string().min(10, 'Review must be at least 10 characters').max(500, 'Review must be less than 500 characters').required('Review is required'),
}).required();

type ReviewFormData = yup.InferType<typeof reviewSchema>;

interface ReviewFormProps {
    productId: string;
    sellerId: string;
    onSuccess?: () => void;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({ productId, sellerId, onSuccess }) => {
    const [rating, setRating] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<ReviewFormData>({
        resolver: yupResolver(reviewSchema),
        defaultValues: {
            rating: 0,
            comment: '',
        },
    });

    const handleRatingChange = (newRating: number) => {
        setRating(newRating);
        setValue('rating', newRating, { shouldValidate: true });
    };

    const onSubmit = async (data: ReviewFormData) => {
        setIsSubmitting(true);
        try {
            const reviewData: CreateReviewData = {
                productId,
                sellerId,
                rating: data.rating,
                comment: data.comment,
            };

            await reviewsApi.create(reviewData);
            toast.success('Review submitted successfully!');
            reset();
            setRating(0);
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error('Error submitting review:', error);
            toast.error(error.response?.data?.message || 'Failed to submit review');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Write a Review</h3>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Rating */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Rating <span className="text-red-500">*</span>
                    </label>
                    <RatingStars
                        rating={rating}
                        size="xl"
                        interactive
                        onChange={handleRatingChange}
                    />
                    {errors.rating && (
                        <p className="mt-1 text-sm text-red-600">{errors.rating.message}</p>
                    )}
                </div>

                {/* Comment */}
                <div>
                    <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
                        Your Review <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        id="comment"
                        {...register('comment')}
                        rows={4}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                        placeholder="Share your experience with this product..."
                    />
                    {errors.comment && (
                        <p className="mt-1 text-sm text-red-600">{errors.comment.message}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">Minimum 10 characters, maximum 500 characters</p>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                    <Button type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
                        Submit Review
                    </Button>
                </div>
            </form>
        </div>
    );
};
