'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash, FaShieldAlt } from 'react-icons/fa';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setCredentials, setLoading, setError } from '../../store/authSlice';
import { authApi } from '../../api/auth';
import { User } from '../../types/api';
import { tokenManager } from '../../utils/tokenManager';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const schema = yup.object({
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().required('Password is required'),
}).required();

type FormData = yup.InferType<typeof schema>;

interface LoginResponse {
    accessToken: string;
    user: User;
}

export const AdminLogin = () => {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const [isLoading, setIsLoadingState] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);

    React.useEffect(() => {
        if (isAuthenticated && user?.role === 'admin') {
            router.replace('/admin/dashboard');
        }
    }, [isAuthenticated, user, router]);

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: yupResolver(schema),
    });

    const onSubmit = async (data: FormData) => {
        setIsLoadingState(true);
        dispatch(setLoading(true));
        try {
            const response = await authApi.adminLogin({ email: data.email, password: data.password }) as LoginResponse;
            handleLoginSuccess(response);
        } catch (error: any) {
            let message = 'Login failed. Please try again.';

            if (error?.message) {
                message = error.message;
            }

            if (error?.status === 401) {
                message = 'Invalid credentials.';
            } else if (error?.status === 403) {
                message = message || 'Access denied. Admin credentials required.';
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

        toast.success('Admin login successful!');

        setTimeout(() => {
            router.replace('/admin/dashboard');
            setIsLoadingState(false);
            dispatch(setLoading(false));
        }, 100);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 animate-fade-in">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30">
                        <FaShieldAlt className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-white">
                        Admin Portal
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        Secure access for administrators only
                    </p>
                </div>

                <form className="mt-8 space-y-6 bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700 shadow-2xl" onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                                Email address
                            </label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                autoFocus
                                disabled={isLoading}
                                placeholder="admin@swapaholic.com"
                                {...register('email')}
                                className="appearance-none rounded-lg relative block w-full px-4 py-3 bg-gray-700/50 border border-gray-600 placeholder-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                            />
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                            )}
                        </div>

                        <div className="relative">
                            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                                Password
                            </label>
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                disabled={isLoading}
                                placeholder="Enter your password"
                                {...register('password')}
                                className="appearance-none rounded-lg relative block w-full px-4 py-3 bg-gray-700/50 border border-gray-600 placeholder-gray-500 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pr-12"
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
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-3 rounded-lg transition-all shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50"
                        >
                            {isLoading ? 'Authenticating...' : 'Sign in to Admin'}
                        </Button>
                    </div>
                </form>

                <div className="text-center">
                    <p className="text-sm text-gray-500">
                        Not an admin?{' '}
                        <a href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                            Go to user login
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};
