'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaUserCircle, FaEnvelope, FaMapMarkerAlt, FaCalendarAlt, FaCheckCircle, FaStar } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { usersApi } from '../../../api/users';
import { productsApi, Product } from '../../../api/products';
import { User } from '../../../types/api';
import ProductCard from '../../../components/ProductCard';
import { ReviewList } from '../../../components/reviews/ReviewList';
import { messagesApi } from '../../../api/messages';
import { useAuth } from '../../../hooks/useAuth';
import { handleApiError } from '../../../utils/errorHandler';

export default function PublicProfilePage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.id as string;
    const { user: currentUser, isAuthenticated } = useAuth();

    const [userProfile, setUserProfile] = useState<User | null>(null);
    const [userProducts, setUserProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProfileData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [profileData, productsResponse] = await Promise.all([
                usersApi.getUserById(userId),
                productsApi.getSellerProducts(userId)
            ]);
            
            setUserProfile(profileData);
            setUserProducts(productsResponse.data || []);
        } catch (err: unknown) {
            console.error(err);
            setError('Failed to load user profile or this user does not exist.');
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (userId) {
            fetchProfileData();
        }
    }, [userId, fetchProfileData]);

    const handleMessageSeller = async () => {
        if (!isAuthenticated) {
            router.push(`/login?redirect=/profile/${userId}`);
            return;
        }

        if (currentUser?.id === userId) {
            toast.warning("You cannot message yourself!");
            return;
        }

        try {
            const response = await messagesApi.startConversation(userId);
            const conversationId = response.conversationId;
            if (conversationId) {
                router.push(`/messages?conversationId=${conversationId}`);
            } else {
                router.push('/messages');
            }
        } catch (error) {
            const errorMessage = handleApiError(error);
            console.error('Failed to start conversation:', errorMessage);
            toast.error(errorMessage);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex justify-center items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error || !userProfile) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md w-full">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Profile Not Found</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    const { firstName, lastName, avatar, createdAt, role, city, state, address, location } = userProfile;
    const fullName = `${firstName} ${lastName}`;

    // Safely determine location string
    const locationDisplay = city && state 
        ? `${city}, ${state}` 
        : city || state || address || (typeof location === 'string' ? location : '');

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header Banner */}
            <div className="h-48 md:h-64 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
                <div className="absolute inset-0 bg-black/20" />
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
                {/* Profile Info Container */}
                <div className="relative -mt-20 md:-mt-24 mb-10 bg-white rounded-2xl shadow-xl p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 border border-gray-100 backdrop-blur-sm bg-white/95">
                    {/* Avatar */}
                    <div className="relative w-32 h-32 md:w-40 md:h-40 flex-shrink-0 rounded-full overflow-hidden border-4 border-white shadow-lg bg-white">
                        {avatar ? (
                            <Image src={avatar} alt={fullName} fill className="object-cover" />
                        ) : (
                            <div className="w-full h-full bg-indigo-100 flex items-center justify-center text-indigo-500 text-6xl">
                                {firstName?.charAt(0) || <FaUserCircle />}
                            </div>
                        )}
                    </div>

                    {/* Info text */}
                    <div className="flex-1 text-center md:text-left mt-2 md:mt-10">
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center md:justify-start gap-2">
                            {fullName}
                            {role !== 'user' && (
                                <FaCheckCircle className="text-blue-500 text-xl" title="Verified Member" />
                            )}
                        </h1>
                        <p className="text-indigo-600 font-medium my-1 capitalize">{role.replace('_', ' ')}</p>
                        
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-3 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                                <FaCalendarAlt className="text-gray-400" /> Member since {new Date(createdAt).getFullYear()}
                            </span>
                            {locationDisplay && (
                                <span className="flex items-center gap-1">
                                    <FaMapMarkerAlt className="text-gray-400" /> {locationDisplay}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="w-full md:w-auto flex flex-col gap-3 mt-4 md:mt-10">
                        {currentUser?.id !== userId && (
                            <button
                                onClick={handleMessageSeller}
                                className="w-full md:w-48 bg-indigo-600 hover:bg-indigo-700 text-white py-3 px-6 rounded-xl font-semibold shadow-md transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5"
                            >
                                <FaEnvelope />
                                Send Message
                            </button>
                        )}
                    </div>
                </div>

                {/* Content Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Left Column (Listings) */}
                    <div className="lg:col-span-3 space-y-8">
                        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 object-contain overflow-hidden">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-gray-900">Active Listings</h2>
                                <span className="bg-indigo-100 text-indigo-800 text-xs font-semibold px-3 py-1 rounded-full">
                                    {userProducts.length} items
                                </span>
                            </div>
                            
                            {userProducts.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {userProducts.map((product) => (
                                        <ProductCard key={product.id} product={product} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <p className="text-gray-500 font-medium">This user has no active listings.</p>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right Column (Reviews sidebar) */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
                            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FaStar className="text-yellow-400" /> 
                                Ratings & Reviews
                            </h2>
                            <ReviewList sellerId={userId} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
