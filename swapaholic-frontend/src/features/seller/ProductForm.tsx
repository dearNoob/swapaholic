import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { productsApi as productApi } from '@/api/products';

const schema = yup.object({
    name: yup.string().required('Product name is required'),
    condition: yup.string().required('Condition is required'),
    category: yup.string().required('Category is required'),
    originalPrice: yup.number().positive().required('Original price is required for prediction'),
    productAge: yup.number().positive().required('Product age (in years) is required'),
    price: yup.number().required('Selling price is required').positive(),
    images: yup.mixed().required('At least one image is required'),
}).required();

export const ProductForm = () => {
    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
    });
    const [generatedDescription, setGeneratedDescription] = useState('');
    const [score, setScore] = useState(0);
    const [regenerateCount, setRegenerateCount] = useState(0);

    const [predictedPriceMsg, setPredictedPriceMsg] = useState('');
    const [isPredicting, setIsPredicting] = useState(false);

    const watchedName = watch('name');
    const watchedCategory = watch('category');
    const watchedCondition = watch('condition');
    const watchedOriginalPrice = watch('originalPrice');
    const watchedAge = watch('productAge');

    useEffect(() => {
        const predictTimer = setTimeout(async () => {
            if (watchedName && watchedCategory && watchedOriginalPrice && watchedAge) {
                setIsPredicting(true);
                try {
                    // Simple heuristic: First word as brand, rest as model
                     const brand = watchedName.split(' ')[0] || 'Unknown';
                     
                     const response = await productApi.predictPrice({
                         category: watchedCategory,
                         brand: brand,
                         model: watchedName,
                         original_price: watchedOriginalPrice,
                         condition: watchedCondition || 'Used',
                         product_age: watchedAge.toString()
                     });

                     if (response.success && response.suggestedPrice) {
                         setPredictedPriceMsg(`✨ AI Predicted Price: ${response.suggestedPrice} BDT`);
                         // Auto-fill price if user hasn't touched the price yet
                         const currentPrice = watch('price');
                         if (!currentPrice || currentPrice === 0) {
                             setValue('price', response.suggestedPrice);
                             toast.info(`Price auto-filled based on AI prediction!`);
                         }
                     } else {
                         setPredictedPriceMsg('');
                         if (response.error) {
                             toast.error(`Prediction Failed: ${response.message || 'Model could not predict for this item.'}`);
                         }
                     }
                } catch (error) {
                    console.error('Prediction failed', error);
                    setPredictedPriceMsg('');
                } finally {
                    setIsPredicting(false);
                }
            }
        }, 1200);

        return () => clearTimeout(predictTimer);
    }, [watchedName, watchedCategory, watchedOriginalPrice, watchedAge, watchedCondition, setValue]);

    const onSubmit = async (data: any) => {
        try {
            const formData = new FormData();
            Object.keys(data).forEach(key => formData.append(key, data[key]));

            const response = await productApi.createProduct(formData) as any;
            setGeneratedDescription(response.generatedDescription);
            setScore(response.score);

            toast.success('Product created successfully!');
        } catch (error) {
            toast.error('Failed to create product');
        }
    };

    const regenerateDescription = async () => {
        if (regenerateCount >= 2) {
            toast.error('You can only regenerate the description twice.');
            return;
        }

        try {
            const response = await productApi.regenerateDescription(watch());
            setGeneratedDescription(response.generatedDescription);
            setRegenerateCount(regenerateCount + 1);
        } catch (error) {
            toast.error('Failed to regenerate description');
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Input label="Product Name" {...register('name')} error={errors.name?.message} />
            <Input label="Condition" {...register('condition')} error={errors.condition?.message} />
            <Input label="Category" {...register('category')} error={errors.category?.message} />
            <Input label="Original Price (BDT)" type="number" {...register('originalPrice')} error={errors.originalPrice?.message} />
            <Input label="Product Age (Years)" type="number" step="0.1" {...register('productAge')} error={errors.productAge?.message} />
            
            <div className="my-2">
                {isPredicting && <p className="text-blue-500 text-sm animate-pulse">🔮 Calculating best market price...</p>}
                {predictedPriceMsg && !isPredicting && <p className="text-green-600 font-semibold">{predictedPriceMsg}</p>}
            </div>

            <Input label="Selling Price (BDT)" type="number" {...register('price')} error={errors.price?.message} />
            <Input label="Images" type="file" {...register('images')} error={errors.images?.message} />

            {generatedDescription && (
                <div>
                    <h3>Generated Description</h3>
                    <TextArea value={generatedDescription} readOnly />
                    <p>Score: {score}</p>
                    <Button onClick={regenerateDescription}>Regenerate Description</Button>
                </div>
            )}

            <Button type="submit">Submit</Button>
        </form>
    );
};
