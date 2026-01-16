'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials, setLoading, setError } from '../../store/authSlice';
import { authApi } from '../../api/auth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import Link from 'next/link';

const schema = yup.object({
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
    confirmPassword: yup.string().oneOf([yup.ref('password')], 'Passwords must match').required('Confirm Password is required'),
    phone: yup.string().required('Phone number is required'),
    address: yup.string().required('Address is required'),
    role: yup.string().oneOf(['buyer', 'seller', 'verifier', 'delivery'], 'Invalid role').required('Role is required'),
}).required();

type FormData = yup.InferType<typeof schema>;

export const Register = () => {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const [isLoading, setIsLoadingState] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: yupResolver(schema),
        defaultValues: {
            role: 'buyer',
        },
    });

    const onSubmit = async (data: FormData) => {
        setIsLoadingState(true);
        dispatch(setLoading(true));
        try {
            // Remove confirmPassword before sending
            const { confirmPassword, ...userData } = data;
            const response = await authApi.register(userData);

            // Backend returns: { accessToken, user }
            const { accessToken, user } = response;

            // Map backend response to frontend format
            dispatch(setCredentials({
                user: user,
                accessToken: accessToken,
            }));

            toast.success('Registration successful! Welcome aboard!');

            // Navigate based on role
            if (user.role === 'seller') {
                router.push('/seller/dashboard');
            } else if (user.role === 'buyer') {
                router.push('/dashboard');
            } else {
                router.push('/');
            }
        } catch (error: any) {
            let message = 'Registration failed. Please try again.';

            // Provide specific error messages based on status code and error message
            if (error.status === 409 || error.response?.status === 409) {
                const serverMessage = error.response?.data?.message?.toLowerCase() || '';
                if (serverMessage.includes('email')) {
                    message = 'Already signed up. This email is already registered.';
                } else if (serverMessage.includes('phone')) {
                    message = 'Already used. This phone number is already registered.';
                } else {
                    message = 'Email or phone already in use.';
                }
            } else if (error.response?.data?.message) {
                message = error.response.data.message;
            }

            dispatch(setError(message));
            toast.error(message);
        } finally {
            setIsLoadingState(false);
            dispatch(setLoading(false));
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 animate-fade-in">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-full flex items-center justify-center mb-4">
                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900">
                        Create your account
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link href="/login" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
                            Sign in
                        </Link>
                    </p>
                </div>
                <form className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg" onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-4">
                        <Input
                            label="First Name"
                            autoFocus
                            disabled={isLoading}
                            placeholder="John"
                            {...register('firstName')}
                            error={errors.firstName?.message}
                        />
                        <Input
                            label="Last Name"
                            disabled={isLoading}
                            placeholder="Doe"
                            {...register('lastName')}
                            error={errors.lastName?.message}
                        />
                        <Input
                            label="Email address"
                            type="email"
                            autoComplete="email"
                            disabled={isLoading}
                            placeholder="you@example.com"
                            {...register('email')}
                            error={errors.email?.message}
                        />
                        <Input
                            label="Phone Number"
                            autoComplete="tel"
                            disabled={isLoading}
                            placeholder="+880 1234-567890"
                            {...register('phone')}
                            error={errors.phone?.message}
                        />
                        <Input
                            label="Address"
                            autoComplete="street-address"
                            disabled={isLoading}
                            placeholder="123 Main St, City"
                            {...register('address')}
                            error={errors.address?.message}
                        />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                I want to join as
                            </label>
                            <select
                                {...register('role')}
                                disabled={isLoading}
                                className="block w-full px-3 py-2 rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 transition-all duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                            >
                                <option value="buyer">Buyer</option>
                                <option value="seller">Seller</option>
                                <option value="verifier">Verifier</option>
                                <option value="delivery">Delivery Personnel</option>
                            </select>
                            {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>}
                        </div>

                        <div className="relative">
                            <Input
                                label="Password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password"
                                disabled={isLoading}
                                placeholder="Min. 6 characters"
                                {...register('password')}
                                error={errors.password?.message}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={isLoading}
                                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                                tabIndex={-1}
                            >
                                {showPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                            </button>
                        </div>
                        <div className="relative">
                            <Input
                                label="Confirm Password"
                                type={showConfirmPassword ? "text" : "password"}
                                autoComplete="new-password"
                                disabled={isLoading}
                                placeholder="Confirm your password"
                                {...register('confirmPassword')}
                                error={errors.confirmPassword?.message}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                disabled={isLoading}
                                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                                tabIndex={-1}
                            >
                                {showConfirmPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <Button
                            type="submit"
                            fullWidth
                            isLoading={isLoading}
                            variant="primary"
                            className="transition-transform hover:scale-[1.02] active:scale-[0.98] bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500"
                        >
                            {isLoading ? 'Creating account...' : 'Create Account'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
