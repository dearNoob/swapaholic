import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { TextArea } from '../../components/ui/TextArea';
import { productApi } from '../../api/product';

const schema = yup.object({
    name: yup.string().required('Product name is required'),
    condition: yup.string().required('Condition is required'),
    category: yup.string().required('Category is required'),
    price: yup.number().required('Price is required').positive(),
    images: yup.mixed().required('At least one image is required'),
}).required();

export const ProductForm = () => {
    const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
        resolver: yupResolver(schema),
    });
    const [generatedDescription, setGeneratedDescription] = useState('');
    const [score, setScore] = useState(0);
    const [regenerateCount, setRegenerateCount] = useState(0);

    const onSubmit = async (data) => {
        try {
            const formData = new FormData();
            Object.keys(data).forEach(key => formData.append(key, data[key]));

            const response = await productApi.createProduct(formData);
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
            <Input label="Price" type="number" {...register('price')} error={errors.price?.message} />
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
