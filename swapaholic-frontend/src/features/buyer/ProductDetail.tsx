import React, { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setCurrentProduct, setLoading, setError } from '../../store/listingSlice';
import { productsApi } from '../../api/products';
import { Button } from '../../components/ui/Button';
import { BidPanel } from './BidPanel';

interface ProductDetailProps {
    productId: string;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ productId }) => {
    const dispatch = useAppDispatch();
    const { currentProduct, isLoading, error } = useAppSelector((state) => state.listing);

    useEffect(() => {
        const fetchProduct = async () => {
            dispatch(setLoading(true));
            try {
                const data = await productsApi.getProductById(productId);
                dispatch(setCurrentProduct(data));
            } catch (err: any) {
                dispatch(setError(err.message || 'Failed to fetch product details'));
            } finally {
                dispatch(setLoading(false));
            }
        };

        if (productId) {
            fetchProduct();
        }
    }, [dispatch, productId]);

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 text-red-600">
                {error}
            </div>
        );
    }

    if (!currentProduct) {
        return null;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
                {/* Image Gallery */}
                <div className="flex flex-col">
                    <div className="w-full aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden sm:aspect-w-2 sm:aspect-h-3">
                        <img
                            src={currentProduct.images[0] || 'https://via.placeholder.com/600'}
                            alt={currentProduct.title}
                            className="w-full h-full object-center object-cover"
                        />
                    </div>
                    <div className="mt-4 grid grid-cols-4 gap-2">
                        {currentProduct.images.slice(1).map((image: string, index: number) => (
                            <div key={index} className="aspect-w-1 aspect-h-1 bg-gray-200 rounded-lg overflow-hidden">
                                <img
                                    src={image}
                                    alt={`${currentProduct.title} ${index + 2}`}
                                    className="w-full h-full object-center object-cover cursor-pointer hover:opacity-75"
                                />
                            </div>
                        ))}
                    </div>
                </div>


                <div className="mt-6">
                    <div className="flex items-center">
                        <h3 className="text-sm font-medium text-gray-900">Condition:</h3>
                        <p className="ml-2 text-sm text-gray-500 capitalize">{currentProduct.condition}</p>
                    </div>
                </div>

                <div className="mt-6 border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-medium text-gray-900">Verification Status</h3>
                    <div className="mt-2 flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${currentProduct.status === 'verified' ? 'bg-green-100 text-green-800' :
                            currentProduct.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                            }`}>
                            {currentProduct.status.toUpperCase()}
                        </span>
                        {currentProduct.aiSuggestedPrice && currentProduct.price <= currentProduct.aiSuggestedPrice && (
                            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1 shadow-sm border border-emerald-200">
                                <span>✨</span> AI Verified Fair Price
                            </span>
                        )}
                    </div>
                    {currentProduct.mlScore && (
                        <div className="mt-4">
                            <h4 className="text-sm font-medium text-gray-900">AI Quality Score</h4>
                            <div className="mt-1 flex items-center">
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${currentProduct.mlScore}%` }}></div>
                                </div>
                                <span className="text-sm text-gray-600">{currentProduct.mlScore}/100</span>
                            </div>
                            {currentProduct.mlSummary && (
                                <p className="mt-2 text-sm text-gray-500 italic">
                                    "{currentProduct.mlSummary}"
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="mt-8">
                    <BidPanel productId={productId} basePrice={currentProduct.price} />
                </div>
            </div>
        </div>

    );
};
