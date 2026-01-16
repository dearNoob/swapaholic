'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials, setLoading, setError, setActiveMode } from '../../store/authSlice';
import { authApi } from '../../api/auth';
import { User } from '../../types/api';
import { tokenManager } from '../../utils/tokenManager';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import Link from 'next/link';

const schema = yup.object({
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().required('Password is required'),
}).required();

type FormData = yup.InferType<typeof schema>;

interface LoginResponse {
    accessToken: string;
    user: User;
    requires2FA?: boolean;
    tempToken?: string;
}

export const Login = () => {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoadingState] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);

    const [showTwoFactor, setShowTwoFactor] = React.useState(false);
    const [twoFactorToken, setTwoFactorToken] = React.useState('');

    const { register, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
        resolver: yupResolver(schema),
    });

    const onSubmit = async (data: FormData) => {
        setIsLoadingState(true);
        dispatch(setLoading(true));
        try {
            if (showTwoFactor) {
                // Validate 2FA
                const response = await authApi.validate2FA({
                    email: data.email,
                    token: twoFactorToken,
                });
                handleLoginSuccess(response);
            } else {
                const response = await authApi.login({ email: data.email, password: data.password }) as LoginResponse;

                // Check if 2FA is required (backend should return a specific structure or code)
                // For this implementation, let's assume if response has 'requires2FA' property
                if (response.requires2FA) {
                    setShowTwoFactor(true);
                    toast.info('Please enter your 2FA code');
                    setIsLoadingState(false);
                    dispatch(setLoading(false));
                    return;
                }

                if ((document.getElementById('remember-me') as HTMLInputElement)?.checked) {
                    localStorage.setItem('rememberMe', JSON.stringify({ email: data.email, password: data.password }));
                } else {
                    localStorage.removeItem('rememberMe');
                }

                handleLoginSuccess(response);
            }
        } catch (error: unknown) {
            let message = 'Login failed. Please try again.';
            const err = error as { status?: number; response?: { status?: number; data?: { message?: string } } };

            // Provide specific error messages based on status code
            if (err.status === 401 || err.response?.status === 401) {
                message = 'Wrong password. Please try again.';
            } else if (err.status === 404 || err.response?.status === 404) {
                message = 'Unauthorized email. Please sign up first.';
            } else if (err.response?.data?.message) {
                const serverMessage = err.response.data.message.toLowerCase();
                if (serverMessage.includes('invalid') || serverMessage.includes('credentials')) {
                    message = 'Invalid email or username. Please check your credentials.';
                } else {
                    message = err.response.data.message;
                }
            }

            dispatch(setError(message));
            toast.error(message);
            setIsLoadingState(false);
            dispatch(setLoading(false));
        }
    };

    const handleLoginSuccess = (response: LoginResponse) => {
        const { accessToken, user } = response;

        console.log('🔐 Login Success - Response:', { accessToken: accessToken?.substring(0, 20) + '...', user });

        dispatch(setCredentials({
            user: user,
            accessToken: accessToken,
        }));

        // Store token and user in localStorage using tokenManager for consistency
        tokenManager.setTokens(accessToken, ''); // We don't have separate refresh token in this response interface yet, typically it's HttpOnly cookie or provided. 
        // If the API returns a refresh token, we should use it. For now, assuming accessToken is enough or refresh token is handled via cookies.
        // Actually, looking at `LoginResponse`, it doesn't show refreshToken. 
        // BUT `tokenManager.setTokens` expects two arguments.
        // Let's check `LoginResponse` interface again.

        localStorage.setItem('user', JSON.stringify(user));

        // Verify localStorage was set
        setTimeout(() => {
            const storedToken = localStorage.getItem('accessToken');
            const storedUser = localStorage.getItem('user');
            console.log('💾 localStorage after setCredentials:', {
                hasToken: !!storedToken,
                hasUser: !!storedUser,
                token: storedToken?.substring(0, 20) + '...',
                user: storedUser?.substring(0, 50) + '...'
            });
        }, 50);

        toast.success('Login successful!');

        // Small delay to ensure localStorage is written before redirect
        setTimeout(() => {
            const redirect = searchParams.get('redirect');
            if (redirect) {
                router.replace(redirect);
            } else if (user.role === 'admin') {
                // Admin users should not reach here (blocked by backend), but handle just in case
                router.replace('/admin/dashboard');
            } else {
                // Unified 'user' role - redirect based on saved activeMode preference
                const savedMode = localStorage.getItem('activeMode') || 'buyer';
                dispatch(setActiveMode(savedMode as 'buyer' | 'seller'));
                console.log('🚀 Redirecting to dashboard with mode:', savedMode);
                router.replace(savedMode === 'seller' ? '/seller/dashboard' : '/buyer/dashboard');
            }

            setIsLoadingState(false);
            dispatch(setLoading(false));
        }, 100);
    };

    React.useEffect(() => {
        const rememberedCredentials = localStorage.getItem('rememberMe');
        if (rememberedCredentials) {
            const { email, password } = JSON.parse(rememberedCredentials);
            setValue('email', email);
            setValue('password', password);
        }
    }, [setValue]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 animate-fade-in">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900">
                        Welcome back
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                            Sign up now
                        </Link>
                    </p>
                </div>
                <form className="mt-8 space-y-6 bg-white p-8 rounded-xl shadow-lg" onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-4">
                        {!showTwoFactor ? (
                            <>
                                <Input
                                    label="Email address"
                                    type="email"
                                    autoComplete="email"
                                    autoFocus
                                    disabled={isLoading}
                                    placeholder="you@example.com"
                                    {...register('email')}
                                    error={errors.email?.message}
                                />
                                <div className="relative">
                                    <Input
                                        label="Password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        disabled={isLoading}
                                        placeholder="Enter your password"
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
                            </>
                        ) : (
                            <div className="mb-4">
                                <label htmlFor="2fa-code" className="block text-sm font-medium text-gray-700 mb-1">
                                    Two-Factor Authentication Code
                                </label>
                                <input
                                    id="2fa-code"
                                    type="text"
                                    maxLength={6}
                                    value={twoFactorToken}
                                    onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, ''))}
                                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm tracking-widest text-center text-xl"
                                    placeholder="000000"
                                    autoFocus
                                />
                                <p className="mt-2 text-sm text-gray-500 text-center">
                                    Enter the 6-digit code from your authenticator app.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                Remember me
                            </label>
                        </div>

                        <div className="text-sm">
                            <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                                Forgot your password?
                            </a>
                        </div>
                    </div>

                    <div>
                        <Button
                            type="submit"
                            fullWidth
                            isLoading={isLoading}
                            className="transition-transform hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {isLoading ? 'Signing in...' : 'Sign in'}
                        </Button>
                    </div>
                </form>

                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-gray-50 text-gray-500">
                                Or continue with
                            </span>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <Button variant="outline" fullWidth onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/google`}>
                            Google
                        </Button>
                        <Button variant="outline" fullWidth onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/facebook`}>
                            Facebook
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
