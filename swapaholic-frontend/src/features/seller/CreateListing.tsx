import React, { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { useDropzone } from 'react-dropzone';
import { FaCloudUploadAlt, FaTrash, FaTag, FaBoxOpen, FaDollarSign, FaClock, FaImage, FaCheckCircle, FaExclamationCircle, FaMapMarkerAlt, FaLocationArrow } from 'react-icons/fa';
import { productsApi } from '../../api/products';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const schema = yup.object({
    title: yup.string()
        .required('Title is required')
        .min(5, 'Title must be at least 5 characters')
        .max(100, 'Title cannot exceed 100 characters'),
    description: yup.string()
        .required('Description is required')
        .min(20, 'Description must be at least 20 characters')
        .max(2000, 'Description cannot exceed 2000 characters'),
    category: yup.string().required('Category is required'),
    condition: yup.string().required('Condition is required'),
    price: yup.number()
        .typeError('Price must be a number')
        .positive('Price must be positive')
        .required('Price is required'),
    auctionDuration: yup.number()
        .typeError('Duration must be a number')
        .positive('Duration must be positive')
        .integer('Duration must be a whole number')
        .min(1, 'Minimum duration is 1 day')
        .max(30, 'Maximum duration is 30 days')
        .required('Auction duration is required'),
    location: yup.string().optional(),
    lat: yup.number().optional().nullable(),
    lng: yup.number().optional().nullable(),
    aiQualityScore: yup.number().optional().default(0),
    aiSuggestedPrice: yup.number().optional().nullable(),
    brand: yup.string().optional().nullable(),
    deviceModel: yup.string().optional().nullable(),
    predictionCategory: yup.string().optional().nullable(),
    originalPrice: yup.number().typeError('Original price must be a number').positive('Original price must be positive').optional().nullable(),
    productAge: yup.number().typeError('Product age must be a number').min(0, 'Product age cannot be negative').optional().nullable(),
}).required();

type FormData = yup.InferType<typeof schema>;

const categories = [
    { id: 'electronics', name: 'Electronics', icon: '💻' },
    { id: 'fashion', name: 'Fashion', icon: '👕' },
    { id: 'home', name: 'Home & Garden', icon: '🏠' },
    { id: 'sports', name: 'Sports', icon: '⚽' },
    { id: 'toys', name: 'Toys & Hobbies', icon: '🧸' },
    { id: 'vehicles', name: 'Vehicles', icon: '🚗' },
    { id: 'collectibles', name: 'Collectibles', icon: '🏺' },
    { id: 'other', name: 'Other', icon: '📦' },
];

const conditions = [
    { id: 'new', name: 'New', description: 'Brand new, unused, unopened, undamaged item in its original packaging.' },
    { id: 'like-new', name: 'Like New', description: 'Item looks and works like new. Has no visible wear, and all facets of the item are flawless and intact.' },
    { id: 'good', name: 'Good', description: 'Item shows some wear from consistent use, but it remains in good condition and works perfectly.' },
    { id: 'fair', name: 'Fair', description: 'Item is fairly worn but continues to function correctly. Signs of wear can include aesthetic issues such as scratches and dents.' },
];

const durationPresets = [3, 5, 7, 14, 30];

interface CreateListingProps {
    listingId?: string;
}

export const CreateListing = ({ listingId }: CreateListingProps) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(!!listingId);
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiLimit, setAiLimit] = useState(2);
    const [isPredicting, setIsPredicting] = useState(false);
    const [aiLanguage, setAiLanguage] = useState<'English' | 'Bengali'>('English');


    const { register, handleSubmit, watch, setValue, reset, formState: { errors, isDirty, isSubmitSuccessful } } = useForm<FormData>({
        resolver: yupResolver(schema) as any,
        defaultValues: {
            auctionDuration: 7,
            lat: null,
            lng: null,
        },
        mode: 'onChange'
    });

    const watchedTitle = watch('title', '');
    const watchedDescription = watch('description', '');
    const watchedCategory = watch('category');
    const watchedCondition = watch('condition');

    const watchedDuration = watch('auctionDuration');
    const watchedLat = watch('lat');
    const watchedLng = watch('lng');

    // Fetch existing data if editing
    useEffect(() => {
        if (listingId) {
            const fetchListing = async () => {
                try {
                    setIsFetching(true);
                    const data = await productsApi.getProductById(listingId);

                    // Reset form with fetched data
                    reset({
                        title: data.title,
                        description: data.description,
                        category: data.category,
                        condition: data.condition,
                        price: data.price,
                        auctionDuration: data.auctionDuration || 7,
                        location: data.location,
                        lat: data.geometry?.coordinates[1] || null,
                        lng: data.geometry?.coordinates[0] || null,
                        aiSuggestedPrice: (data as any).aiSuggestedPrice || null,
                    });

                    // Set existing images
                    if (data.images && Array.isArray(data.images)) {
                        setExistingImages(data.images);
                    }
                } catch (error) {
                    console.error('Error fetching listing:', error);
                    toast.error('Failed to load listing details');
                    router.push('/seller/listings');
                } finally {
                    setIsFetching(false);
                }
            };
            fetchListing();
        }
    }, [listingId, reset, router, setValue]);

    // Warn on unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty && !isSubmitSuccessful && !isLoading) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty, isSubmitSuccessful, isLoading]);

    const handleAIAnalyze = async () => {
        if (aiLimit <= 0) {
            toast.warning('You have reached the limit for AI description generation.');
            return;
        }

        const title = watch('title');
        const category = watch('category');
        const condition = watch('condition');
        const predictionCategory = watch('predictionCategory');
        const brand = watch('brand');
        const deviceModel = watch('deviceModel');
        const originalPrice = watch('originalPrice');
        const productAge = watch('productAge');

        if (!title || !category || !condition) {
            toast.error('Please fill in Title, Category and Condition first.');
            return;
        }

        if (images.length === 0 && existingImages.length === 0) {
            toast.error('Please upload at least one image first.');
            return;
        }

        try {
            setIsAnalyzing(true);
            const formData = new FormData();
            const startingPrice = watch('price');
            formData.append('title', title);
            formData.append('category', category);
            formData.append('condition', condition);
            formData.append('language', aiLanguage);
            if (predictionCategory) formData.append('predictionCategory', String(predictionCategory));
            if (brand) formData.append('brand', String(brand));
            if (deviceModel) formData.append('deviceModel', String(deviceModel));
            if (originalPrice !== undefined && originalPrice !== null) formData.append('originalPrice', String(originalPrice));
            if (startingPrice !== undefined && startingPrice !== null) formData.append('price', String(startingPrice));
            if (productAge !== undefined && productAge !== null) formData.append('productAge', String(productAge));


            // Append first image
            if (images.length > 0) {
                formData.append('images', images[0]);
            } else {
                toast.warning('Please upload a new image for AI analysis.');
                setIsAnalyzing(false);
                return;
            }

            const result = await productsApi.analyzeProduct(formData);

            setValue('description', result.description, { shouldValidate: true });
            setValue('aiQualityScore', result.score);
            setAiLimit(prev => prev - 1);
            toast.success(`Description generated! Quality Score: ${result.score}/100`);

        } catch (error: any) {
            // Debug logging
            console.error('AI Analysis failed:', error);
            console.log('Error type:', typeof error);
            console.log('Error keys:', Object.keys(error || {}));
            console.log('Error stringified:', JSON.stringify(error, Object.getOwnPropertyNames(error)));

            // apiClient returns { status, message, errors, code } format
            const errorMessage = error?.message
                || error?.response?.data?.message
                || 'Failed to generate description. Please try again.';

            // Check for quota exceeded error
            if (error?.status === 429 || errorMessage.includes('quota') || errorMessage.includes('429')) {
                toast.error('AI quota exceeded. Please wait a minute and try again.');
            } else if (error?.status === 403) {
                toast.error('Access denied. Please ensure you are logged in.');
            } else {
                toast.error(errorMessage);
            }
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handlePredictPrice = async () => {
        const brandVal = watch('brand');
        const modelVal = watch('deviceModel');
        const listCategory = watch('category');
        const predictionCategory = watch('predictionCategory');
        const condition = watch('condition');
        const originalPrice = watch('originalPrice');
        const productAge = watch('productAge');
        const location = watch('location');

        const finalCategory = predictionCategory || listCategory;

        if (!brandVal || !modelVal || !finalCategory || !originalPrice || productAge === null || productAge === undefined) {
            toast.error('Please fill in Prediction Category, Brand, Model, Original Price, and Product Age to predict the price.');
            return;
        }

        setIsPredicting(true);
        try {
            const response = await productsApi.predictPrice({
                category: finalCategory,
                brand: brandVal,
                model: modelVal,
                original_price: originalPrice,
                condition: condition || 'Used',
                product_age: productAge.toString(),
                location: location || 'Dhaka'
            });

            if (response.success && response.suggestedPrice) {
                setValue('aiSuggestedPrice', response.suggestedPrice);
                const sourceLabel = response.source === 'ml_model' ? '🤖 AI Model' : '📊 Smart Estimate';
                toast.success(`${sourceLabel} Prediction Complete!`);
            } else {
                toast.error(`Prediction Failed: ${response.message || 'Model could not predict for this item.'}`);
            }
        } catch (error: any) {
            console.error('Prediction failed', error);
            const errorMsg = error?.message || error?.response?.data?.message || 'Failed to predict price.';
            toast.error(errorMsg);
        } finally {
            setIsPredicting(false);
        }
    };

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const totalImages = existingImages.length + images.length;
        const remainingSlots = 5 - totalImages;

        if (remainingSlots <= 0) {
            toast.warning('Maximum 5 images allowed');
            return;
        }

        const filesToAdd = acceptedFiles.slice(0, remainingSlots);

        if (filesToAdd.length < acceptedFiles.length) {
            toast.info(`Only added ${filesToAdd.length} images. Maximum 5 images allowed.`);
        }

        const newImages = [...images, ...filesToAdd];
        setImages(newImages);

        const newPreviews = filesToAdd.map(file => URL.createObjectURL(file));
        setImagePreviews(prev => [...prev, ...newPreviews]);
    }, [images, existingImages]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.webp']
        },
        maxSize: 10485760, // 10MB
        disabled: (images.length + existingImages.length) >= 5
    });

    const removeImage = (index: number) => {
        const newImages = images.filter((_, i) => i !== index);
        const newPreviews = imagePreviews.filter((_, i) => i !== index);

        URL.revokeObjectURL(imagePreviews[index]);

        setImages(newImages);
        setImagePreviews(newPreviews);
    };

    const removeExistingImage = (index: number) => {
        const newExistingImages = existingImages.filter((_, i) => i !== index);
        setExistingImages(newExistingImages);
    };

    const handleGetLocation = async () => {
        setGettingLocation(true);

        // Helper: try IP-based geolocation as fallback
        const tryIPGeolocation = async () => {
            try {
                const response = await fetch('https://ipapi.co/json/');
                if (!response.ok) {
                    throw new Error(`IP geolocation API returned ${response.status}`);
                }
                const data = await response.json();
                const lat = Number(data.latitude);
                const lng = Number(data.longitude);
                if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                    setValue('lat', lat);
                    setValue('lng', lng);
                    const city = data.city || '';
                    const region = data.region || '';
                    const country = data.country_name || '';
                    const locationStr = [city, region, country].filter(Boolean).join(', ');
                    setValue('location', locationStr || `Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
                    setGettingLocation(false);
                    toast.success(`Location set to: ${locationStr || 'coordinates captured'} (approximate)`);
                } else {
                    throw new Error('Invalid coordinates from IP geolocation');
                }
            } catch (ipError: any) {
                console.error('IP Geolocation fallback failed:', ipError);
                setGettingLocation(false);
                toast.error('Could not determine your location. Please enter it manually.');
            }
        };

        // First, try browser's native geolocation
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setValue('lat', position.coords.latitude);
                    setValue('lng', position.coords.longitude);
                    setValue('location', `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`);
                    setGettingLocation(false);
                    toast.success('Location retrieved successfully');
                },
                async (error) => {
                    console.warn('Browser geolocation failed, trying IP-based fallback:', error.message);
                    toast.info('Browser location unavailable, using approximate location...');
                    await tryIPGeolocation();
                },
                {
                    enableHighAccuracy: false,
                    timeout: 5000,
                    maximumAge: 300000
                }
            );
        } else {
            // Browser doesn't support geolocation at all, use IP fallback
            toast.info('Browser location not supported, using approximate location...');
            await tryIPGeolocation();
        }
    };

    const onSubmit = async (data: FormData) => {
        const totalImages = images.length + existingImages.length;
        if (totalImages < 4) {
            toast.error('Please upload at least 4 images (Front, Back, Sides) for QC standards.');
            return;
        }

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('title', data.title);
            formData.append('description', data.description);
            formData.append('category', data.category);
            formData.append('condition', data.condition);
            formData.append('price', data.price.toString());
            formData.append('basePrice', data.price.toString());
            formData.append('auctionDuration', data.auctionDuration.toString());
            if (data.location) formData.append('location', data.location);
            if (data.lat && data.lng) {
                formData.append('geometry', JSON.stringify({
                    type: 'Point',
                    coordinates: [data.lng, data.lat]
                }));
            }
            if (data.aiQualityScore) {
                formData.append('aiQualityScore', data.aiQualityScore.toString());
            }
            if (data.aiSuggestedPrice) {
                formData.append('aiSuggestedPrice', data.aiSuggestedPrice.toString());
            }

            // Append new images
            images.forEach((image) => {
                formData.append('images', image);
            });

            // Handle existing images for update
            if (listingId) {
                formData.append('existingImages', JSON.stringify(existingImages));
                await productsApi.updateProduct(listingId, formData);
                toast.success('Listing updated successfully!');
            } else {
                await productsApi.createProduct(formData);
                toast.success('Listing created successfully!');
            }

            router.push('/seller/listings');
        } catch (error: any) {
            console.error('Save listing error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
            console.error('Error status:', error?.status, 'Error message:', error?.message);
            const errorMsg = error?.message || error?.response?.data?.message || 'Failed to save listing. Please try again.';
            toast.error(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-black py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
                <div className="md:flex md:items-center md:justify-between mb-8">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-3xl font-extrabold text-black sm:text-4xl sm:truncate">
                            {listingId ? 'Edit Listing' : 'Create New Listing'}
                        </h2>
                        <p className="mt-1 text-lg text-black/80">
                            {listingId ? 'Update your product details below.' : 'Fill in the details below to list your item for sale.'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    {/* Product Details Section */}
                    <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 transition-all hover:shadow-2xl">
                        <div className="px-6 py-4 bg-linear-to-r from-indigo-600 to-purple-600 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <FaTag className="text-indigo-200" />
                                Product Details
                            </h3>
                            <span className="text-indigo-100 text-sm bg-white/20 px-3 py-1 rounded-full">Step 1 of 2</span>
                        </div>

                        <div className="p-6 sm:p-8 space-y-8">
                            {/* Title */}
                            <div className="relative">
                                <Input
                                    label="Product Title"
                                    style={{ color: 'black' }}
                                    placeholder="e.g., Vintage Sony Walkman Cassette Player"
                                    {...register('title')}
                                    error={errors.title?.message}
                                    className="text-lg text-black"
                                />
                                <div className={`absolute top-0 right-0 text-xs mt-1 ${watchedTitle.length > 90 ? 'text-red-600 font-bold' : 'text-black/60'
                                    }`}>
                                    {watchedTitle.length}/100
                                </div>
                            </div>

                            {/* Category & Condition Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-sm font-medium text-black mb-2">
                                        Category
                                    </label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {categories.map((cat) => (
                                            <div
                                                key={cat.id}
                                                onClick={() => setValue('category', cat.id, { shouldValidate: true })}
                                                className={`cursor-pointer border rounded-lg p-3 flex items-center gap-2 transition-all ${watchedCategory === cat.id
                                                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                                                    : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <span className="text-xl">{cat.icon}</span>
                                                <span className={`text-sm font-medium ${watchedCategory === cat.id ? 'text-indigo-700' : 'text-black'}`}>
                                                    {cat.name}
                                                </span>
                                                {watchedCategory === cat.id && <FaCheckCircle className="ml-auto text-indigo-500" />}
                                            </div>
                                        ))}
                                    </div>
                                    <input type="hidden" {...register('category')} />
                                    {errors.category && (
                                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                            <FaExclamationCircle /> {errors.category.message}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-black mb-2">
                                        Condition
                                    </label>
                                    <div className="space-y-3">
                                        {conditions.map((cond) => (
                                            <div
                                                key={cond.id}
                                                onClick={() => setValue('condition', cond.id, { shouldValidate: true })}
                                                className={`cursor-pointer border rounded-lg p-3 transition-all ${watchedCondition === cond.id
                                                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                                                    : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`font-medium ${watchedCondition === cond.id ? 'text-indigo-700' : 'text-black'}`}>
                                                        {cond.name}
                                                    </span>
                                                    {watchedCondition === cond.id && <FaCheckCircle className="text-indigo-500" />}
                                                </div>
                                                <p className="text-xs text-black/60">{cond.description}</p>
                                            </div>
                                        ))}
                                    </div>
                                    <input type="hidden" {...register('condition')} />
                                    {errors.condition && (
                                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                            <FaExclamationCircle /> {errors.condition.message}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Image Upload Section */}
                            <div className="bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100 transition-all hover:shadow-2xl">
                                <div className="px-6 py-4 bg-linear-to-r from-purple-600 to-pink-600 border-b border-gray-200 flex items-center justify-between">
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <FaImage className="text-purple-200" />
                                        Product Images
                                    </h3>
                                    <span className="text-purple-100 text-sm bg-white/20 px-3 py-1 rounded-full">Step 2 of 2</span>
                                </div>

                                <div className="p-6 sm:p-8">
                                    <div className="mb-4">
                                        <p className="text-sm text-black/70 mb-2">
                                            Quality Control: Upload at least 4 images covering different angles (Front, Back, Sides).
                                        </p>
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <span className="bg-gray-100 px-2 py-1 rounded">JPG, PNG, WEBP</span>
                                            <span className="bg-gray-100 px-2 py-1 rounded">Max 10MB each</span>
                                        </div>
                                    </div>

                                    <div
                                        {...getRootProps()}
                                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${isDragActive
                                            ? 'border-indigo-500 bg-indigo-50 scale-[1.02]'
                                            : (images.length + existingImages.length) >= 5
                                                ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                                                : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'
                                            }`}
                                    >
                                        <input {...getInputProps()} />
                                        <div className="flex flex-col items-center justify-center space-y-4">
                                            <div className={`p-4 rounded-full ${isDragActive ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                                                <FaCloudUploadAlt className={`text-4xl ${isDragActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                                            </div>
                                            <div className="space-y-1">
                                                <p className="text-lg font-medium text-black">
                                                    {isDragActive ? 'Drop images here' : 'Drag & drop images here'}
                                                </p>
                                                <p className="text-sm text-black/60">
                                                    or click to browse from your computer
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Image Previews */}
                                    {(imagePreviews.length > 0 || existingImages.length > 0) && (
                                        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                                            {/* Existing Images */}
                                            {existingImages.map((img, index) => (
                                                <div key={`existing-${index}`} className="group relative aspect-square rounded-xl overflow-hidden shadow-md border border-gray-200 bg-gray-100">
                                                    <img
                                                        src={img}
                                                        alt={`Existing ${index + 1}`}
                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeExistingImage(index);
                                                            }}
                                                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transform hover:scale-110 transition-all shadow-lg"
                                                            title="Remove image"
                                                        >
                                                            <FaTrash size={16} />
                                                        </button>
                                                    </div>
                                                    {index === 0 && (
                                                        <div className="absolute top-2 left-2 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm">
                                                            Cover
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            {/* New Images */}
                                            {imagePreviews.map((preview, index) => (
                                                <div key={`new-${index}`} className="group relative aspect-square rounded-xl overflow-hidden shadow-md border border-gray-200 bg-gray-100">
                                                    <img
                                                        src={preview}
                                                        alt={`Preview ${index + 1}`}
                                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                    />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                removeImage(index);
                                                            }}
                                                            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transform hover:scale-110 transition-all shadow-lg"
                                                            title="Remove image"
                                                        >
                                                            <FaTrash size={16} />
                                                        </button>
                                                    </div>
                                                    {index === 0 && existingImages.length === 0 && (
                                                        <div className="absolute top-2 left-2 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-md shadow-sm">
                                                            Cover
                                                        </div>
                                                    )}
                                                </div>
                                            ))}

                                            {(images.length + existingImages.length) < 5 && (
                                                <div
                                                    onClick={(e) => {
                                                        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                                                        input?.click();
                                                    }}
                                                    className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-gray-50 transition-all"
                                                >
                                                    <FaPlus className="text-gray-400 mb-2" size={20} />
                                                    <span className="text-xs text-black/70 font-medium">Add More</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Description and AI Section */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-black">
                                        Description
                                    </label>
                                    <div className="flex items-center gap-2">
                                        {watch('aiQualityScore') ? (
                                            <div className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">
                                                <FaCheckCircle /> Quality Score: {watch('aiQualityScore')}
                                            </div>
                                        ) : null}
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleAIAnalyze}
                                            isLoading={isAnalyzing}
                                            disabled={isAnalyzing || aiLimit <= 0}
                                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                        >
                                            <span className="mr-1">✨</span>
                                            {aiLimit < 2 ? 'Regenerate' : 'Auto-Generate'}
                                            <span className="ml-1 text-xs opacity-60">({aiLimit} left)</span>
                                        </Button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-medium text-gray-500">Language:</label>
                                        <select
                                            value={aiLanguage}
                                            onChange={(e) => setAiLanguage(e.target.value as any)}
                                            className="text-xs text-black border border-gray-200 rounded px-1 py-1 focus:ring-1 focus:ring-indigo-500 outline-none bg-white "
                                            style={{ color: "black" }}
                                        >
                                            <option value="English">English</option>
                                            <option value="Bengali">Bengali</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="relative">

                                    <textarea
                                        {...register('description')}
                                        rows={6}
                                        placeholder="Describe your item in detail. Include features, condition specifics, and any other relevant information."
                                        className={`shadow-sm block w-full sm:text-sm border rounded-lg p-4 transition-colors focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black ${errors.description ? 'border-red-300' : 'border-gray-300' 
                                            }`}
                                        style={{ color: "black" }}
                                    />
                                    <div className={`absolute bottom-3 right-3 text-xs ${watchedDescription.length > 1900 ? 'text-red-600 font-bold' : 'text-black/60'
                                        }`}>
                                        {watchedDescription.length}/2000
                                    </div>
                                </div>
                                {errors.description && (
                                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                        <FaExclamationCircle /> {errors.description.message}
                                    </p>
                                )}
                            </div>

                            {/* Location */}
                            <div>
                                <label className="block text-sm font-medium text-black mb-2">
                                    Location
                                </label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <Input
                                            placeholder="e.g., Dhaka, Bangladesh"
                                            {...register('location')}
                                            error={errors.location?.message}
                                            icon={<FaMapMarkerAlt className="text-gray-400" />}
                                            className="text-black"
                                            style={{ color: 'black' }}
                                        />
                                    </div>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleGetLocation}
                                        isLoading={gettingLocation}
                                        className="whitespace-nowrap"
                                    >
                                        <FaLocationArrow className="mr-2" />
                                        Use Current Location
                                    </Button>
                                </div>
                                {watchedLat && watchedLng && (
                                    <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                                        <FaCheckCircle /> Coordinates captured: {watchedLat.toFixed(4)}, {watchedLng.toFixed(4)}
                                    </p>
                                )}
                                <input type="hidden" {...register('lat')} />
                                <input type="hidden" {...register('lng')} />
                            </div>

                            {/* AI Prediction Fields */}
                            <div className="pt-4 border-t border-gray-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <span className="text-lg">🔮</span>
                                    <h4 className="text-sm font-semibold text-black uppercase tracking-wide">AI Price Prediction</h4>
                                    <span className="text-xs text-black/60">(Fill these fields to get a smart price suggestion)</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-sm font-medium text-black mb-2">
                                            Device Category <span className="text-black/50 text-xs">(Select the closest match for accurate prediction)</span>
                                        </label>
                                        <select
                                            {...register('predictionCategory')}
                                            className={`text-black dark:text-black focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md py-2 px-3 bg-white dark:bg-white ${errors.predictionCategory ? 'border-red-300 ring-1 ring-red-300' : ''}`}
                                            style={{ color: 'black' }}
                                        >
                                            <option value="">Select a category</option>
                                            <option value="Smartphone">Smartphone</option>
                                            <option value="Laptop">Laptop</option>
                                            <option value="Tablet">Tablet / iPad</option>
                                            <option value="Desktop PC">Desktop PC</option>
                                            <option value="Smartwatch">Smartwatch / Apple Watch</option>
                                            <option value="Camera">Camera</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-black mb-2">
                                            Brand Name <span className="text-black/50 text-xs">(e.g., Samsung, Apple, HP)</span>
                                        </label>
                                        <input
                                            type="text"
                                            {...register('brand')}
                                            className={`text-black dark:text-black focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md py-2 px-3 bg-white dark:bg-white ${errors.brand ? 'border-red-300 ring-1 ring-red-300' : ''}`}
                                            placeholder="e.g., Samsung"
                                            style={{ color: 'black' }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-black mb-2">
                                            Device / Model <span className="text-black/50 text-xs">(e.g., Galaxy S21, iPhone 13)</span>
                                        </label>
                                        <input
                                            type="text"
                                            {...register('deviceModel')}
                                            className={`text-black dark:text-black focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md py-2 px-3 bg-white dark:bg-white ${errors.deviceModel ? 'border-red-300 ring-1 ring-red-300' : ''}`}
                                            placeholder="e.g., Galaxy S21" style={{ color: 'black' }}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                                    <div>
                                        <label className="block text-sm font-medium text-black mb-2">
                                            Original Price (BDT)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.10"
                                            {...register('originalPrice')}
                                            className={`text-black dark:text-black focus:ring-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md py-2 px-3 bg-white dark:bg-white ${errors.originalPrice ? 'border-red-300 ring-1 ring-red-300' : ''}`}
                                            placeholder="Original buying price" style={{ color: 'black' }}

                                        />
                                        {errors.originalPrice && (
                                            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                                <FaExclamationCircle /> {errors.originalPrice.message}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-black mb-2">
                                            Product Age (Years)
                                        </label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            {...register('productAge')}
                                            className={`text-black dark:text-black focus:ring-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md py-2 px-3 bg-white dark:bg-white ${errors.productAge ? 'border-red-300 ring-1 ring-red-300' : ''}`}
                                            placeholder="How old is the product?"
                                            style={{ color: 'black' }}
                                        />
                                        {errors.productAge && (
                                            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                                <FaExclamationCircle /> {errors.productAge.message}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Price & Duration */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-gray-100">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-black">
                                            Starting Price
                                        </label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handlePredictPrice}
                                            isLoading={isPredicting}
                                            disabled={isPredicting}
                                            className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                        >
                                            <span className="mr-1">🔮</span>
                                            Predict Price
                                        </Button>
                                    </div>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-black sm:text-sm">৳</span>
                                        </div>
                                        <input
                                            type="number"
                                            step="0.10"
                                            {...register('price')}
                                            className={`text-black dark:text-black focus:ring-indigo-500 dark:bg-white focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-lg border-gray-300 rounded-md py-3 ${errors.price ? 'border-red-300 ring-1 ring-red-300' : ''
                                                }`}
                                            placeholder="0.00"
                                            style={{ color: 'black' }}
                                        />
                                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                            <span className="text-black sm:text-sm">BDT</span>
                                        </div>
                                    </div>
                                    {errors.price && (
                                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                            <FaExclamationCircle /> {errors.price.message}
                                        </p>
                                    )}

                                    {/* AI Price Recommendation Display */}
                                    {watch('aiSuggestedPrice') && (
                                        <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="bg-white p-2 rounded-lg shadow-sm">
                                                    <span className="text-xl">📊</span>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">AI Recommended Price</p>
                                                    <p className="text-xl font-extrabold text-black">৳{watch('aiSuggestedPrice')?.toLocaleString()} <span className="text-xs font-normal text-black/60 ml-1">BDT</span></p>
                                                </div>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setValue('price', watch('aiSuggestedPrice')!, { shouldValidate: true })}
                                                className="bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                            >
                                                Apply This Price
                                            </Button>
                                        </div>
                                    )}
                                </div>


                                <div>
                                    <label className="block text-sm font-medium text-black mb-2">
                                        Auction Duration (Days)
                                    </label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {durationPresets.map(days => (
                                            <button
                                                key={days}
                                                type="button"
                                                onClick={() => setValue('auctionDuration', days, { shouldValidate: true })}
                                                className={`px-3 py-1.5 text-sm rounded-md border transition-all ${watchedDuration === days
                                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                                    : 'bg-white text-black border-gray-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {days} Days
                                            </button>
                                        ))}
                                    </div>
                                    <div className="relative rounded-md shadow-sm">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaClock className="text-black" />
                                        </div>
                                        <input
                                            type="number"
                                            {...register('auctionDuration')}
                                            className={`text-black dark:text-black focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2 bg-white dark:bg-white ${errors.auctionDuration ? 'border-red-300 ring-1 ring-red-300' : ''
                                                }`}
                                        />
                                    </div>
                                    {errors.auctionDuration && (
                                        <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                            <FaExclamationCircle /> {errors.auctionDuration.message}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>



                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-4 pt-6">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => router.back()}
                            className="px-8 py-3 text-base"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            isLoading={isLoading}
                            className="px-8 py-3 text-base bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                        >
                            {listingId ? 'Update Listing' : 'Create Listing'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Helper icon for the "Add More" button
const FaPlus = ({ className, size }: { className?: string, size?: number }) => (
    <svg
        stroke="currentColor"
        fill="currentColor"
        strokeWidth="0"
        viewBox="0 0 448 512"
        height={size || "1em"}
        width={size || "1em"}
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path d="M416 208H272V64c0-17.67-14.33-32-32-32h-32c-17.67 0-32 14.33-32 32v144H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h144v144c0 17.67 14.33 32 32 32h32c17.67 0 32-14.33 32-32V304h144c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"></path>
    </svg>
);
