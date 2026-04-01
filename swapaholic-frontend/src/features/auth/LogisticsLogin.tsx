'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash, FaTruck } from 'react-icons/fa';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials, setLoading, setError } from '../../store/authSlice';
import { authApi } from '../../api/auth';
import { User } from '../../types/api';
import { tokenManager } from '../../utils/tokenManager';
import { Button } from '../../components/ui/Button';

const schema = yup.object({
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().required('Password is required'),
}).required();

type FormData = yup.InferType<typeof schema>;

interface LoginResponse {
    accessToken: string;
    user: User;
}

export const LogisticsLogin = () => {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const [isLoading, setIsLoadingState] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: yupResolver(schema),
    });

    const onSubmit = async (data: FormData) => {
        setIsLoadingState(true);
        dispatch(setLoading(true));
        try {
            const response = await authApi.logisticsLogin({ email: data.email, password: data.password }) as LoginResponse;
            handleLoginSuccess(response);
        } catch (error: unknown) {
            let message = 'Login failed. Please try again.';
            const err = error as { status?: number; response?: { status?: number; data?: { message?: string; accountStatus?: string } } };

            if (err.status === 401 || err.response?.status === 401) {
                message = 'Invalid credentials.';
            } else if (err.status === 403 || err.response?.status === 403) {
                const serverMsg = err.response?.data?.message || '';
                if (serverMsg.includes('pending')) {
                    message = 'Your account is pending admin approval. Please wait.';
                } else {
                    message = 'Access denied. Logistics officer credentials required.';
                }
            } else if (err.response?.data?.message) {
                message = err.response.data.message;
            }

            dispatch(setError(message));
            toast.error(message);
            setIsLoadingState(false);
            dispatch(setLoading(false));
        }
    };

    const handleLoginSuccess = (response: LoginResponse) => {
        const { accessToken, user } = response;

        dispatch(setCredentials({
            user: user,
            accessToken: accessToken,
        }));


        localStorage.setItem('user', JSON.stringify(user));

        toast.success('Login successful!');

        setTimeout(() => {
            router.replace('/logistics/dashboard');
            setIsLoadingState(false);
            dispatch(setLoading(false));
        }, 100);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 animate-fade-in">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-teal-500/30">
                        <FaTruck className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-white">
                        Logistics Portal
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        Secure access for logistics officers only
                    </p>
                </div>

                <form className="mt-8 space-y-6 bg-slate-800/50 backdrop-blur-sm p-8 rounded-xl border border-teal-700/30 shadow-2xl" onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="logistics-email" className="block text-sm font-medium text-gray-300 mb-1">
                                Email address
                            </label>
                            <input
                                id="logistics-email"
                                type="email"
                                autoComplete="email"
                                autoFocus
                                disabled={isLoading}
                                placeholder="officer@swapaholic.com"
                                {...register('email')}
                                className="appearance-none rounded-lg relative block w-full px-4 py-3 bg-slate-700/50 border border-slate-600 placeholder-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                            />
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="relative">
                            <label htmlFor="logistics-password" className="block text-sm font-medium text-gray-300 mb-1">
                                Password
                            </label>
                            <input
                                id="logistics-password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                disabled={isLoading}
                                placeholder="Enter your password"
                                {...register('password')}
                                className="appearance-none rounded-lg relative block w-full px-4 py-3 bg-slate-700/50 border border-slate-600 placeholder-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all pr-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={isLoading}
                                className="absolute right-3 top-9 text-gray-400 hover:text-gray-200 transition-colors disabled:opacity-50"
                                tabIndex={-1}
                            >
                                {showPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                            </button>
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <Button
                            type="submit"
                            fullWidth
                            isLoading={isLoading}
                            className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-medium py-3 rounded-lg transition-all shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50"
                        >
                            {isLoading ? 'Authenticating...' : 'Sign in to Logistics'}
                        </Button>
                    </div>
                </form>

                <div className="text-center space-y-2">
                    <p className="text-sm text-gray-500">
                        Don&apos;t have an account?{' '}
                        <a href="/logistics/register" className="text-teal-400 hover:text-teal-300 transition-colors">
                            Register as Logistics Officer
                        </a>
                    </p>
                    <p className="text-sm text-gray-600">
                        Not a logistics officer?{' '}
                        <a href="/login" className="text-gray-400 hover:text-gray-300 transition-colors">
                            Go to user login
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};
