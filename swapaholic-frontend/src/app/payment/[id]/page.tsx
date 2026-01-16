'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { EscrowPayment } from '../../../features/buyer/EscrowPayment';
import { productsApi } from '../../../api/products';

export default function PaymentPage() {
    const params = useParams();
    const id = params.id as string;
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const fetchedProduct = await productsApi.getProductById(id);
                setProduct(fetchedProduct);
            } catch (error) {
                console.error('Failed to fetch product', error);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchProduct();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!product) {
        return <div className="text-center py-12">Product not found</div>;
    }

    return (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <EscrowPayment
                productId={id}
                productTitle={product.title}
                amount={product.price}
            />
        </div>
    );
}
