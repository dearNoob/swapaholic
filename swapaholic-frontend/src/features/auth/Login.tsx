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
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { resolveApiPath } from '../../lib/publicUrls';
import Link from 'next/link';

const schema = yup.object({
    email: yup.string().email('Invalid email').required('Email is required'),
    password: yup.string().required('Password is required'),
}).required();

type FormData = yup.InferType<typeof schema>;

interface LoginResponse {
    accessToken: string;
    user: User;
    require2FA?: boolean;
    tempToken?: string;
}

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === 'object') {
        if ('message' in error && typeof error.message === 'string') {
            return error.message;
        }

        if ('status' in error && error.status === 404) {
            return 'Account not found. Please sign up first.';
        }

        if ('status' in error && error.status === 401) {
            return 'Wrong password or email. Please try again.';
        }
    }

    return fallback;
};

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
                // Validate 2FA (New Device OTP)
                const response = await authApi.verifyOTP({
                    email: data.email,
                    otp: twoFactorToken,
                    purpose: 'LOGIN_2FA'
                });

                if (response.accessToken && response.user) {
                    handleLoginSuccess({
                        accessToken: response.accessToken,
                        user: response.user
                    });
                } else {
                    throw new Error('Invalid 2FA response');
                }
            } else {
                const response = await authApi.login({ email: data.email, password: data.password }) as LoginResponse;

                // Check if 2FA is required (backend should return a specific structure or code)
                // For this implementation, let's assume if response has 'requires2FA' property
                if (response.require2FA) {
                    setShowTwoFactor(true);
                    toast.info('Please enter your 2FA code');
                    setIsLoadingState(false);
                    dispatch(setLoading(false));
                    return;
                }

                if ((document.getElementById('remember-me') as HTMLInputElement)?.checked) {
                    localStorage.setItem('rememberMe', JSON.stringify({ email: data.email }));
                } else {
                    localStorage.removeItem('rememberMe');
                }

                handleLoginSuccess(response);
            }
        } catch (error) {
            const message = getErrorMessage(error, 'Login failed. Please try again.');
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

        // Small delay to ensure localStorage is written before redirect
        setTimeout(() => {
            const redirect = searchParams.get('redirect');
            if (redirect) {
                router.replace(redirect);
            } else if (user.role === 'admin') {
                // Admin users should not reach here (blocked by backend), but handle just in case
                router.replace('/admin/dashboard');
            } else if (user.role === 'logistics_officer') {
                router.replace('/logistics/dashboard');
            } else {
                // Unified 'user' role - redirect based on saved activeMode preference
                const savedMode = localStorage.getItem('activeMode') || 'buyer';
                dispatch(setActiveMode(savedMode as 'buyer' | 'seller'));

                router.replace(savedMode === 'seller' ? '/seller/dashboard' : '/buyer/dashboard');
            }

            setIsLoadingState(false);
            dispatch(setLoading(false));
        }, 100);
    };

    React.useEffect(() => {
        const rememberedCredentials = localStorage.getItem('rememberMe');
        if (rememberedCredentials) {
            const { email } = JSON.parse(rememberedCredentials);
            setValue('email', email);
        }
    }, [setValue]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100 dark:from-slate-950 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 animate-fade-in">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
                        <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                        Welcome back
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Don&apos;t have an account?{' '}
                        <Link href="/register" className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 transition-colors">
                            Sign up now
                        </Link>
                    </p>

                </div>
                <form className="mt-8 space-y-6 bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg border border-transparent dark:border-slate-800" onSubmit={handleSubmit(onSubmit)}>
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
                                    <Input label="Password" type={showPassword ? "text" : "password"}
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
                                        className="absolute right-3 top-9 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                                    </button>

                                </div>
                            </>
                        ) : (
                            <div className="mb-4">
                                <label htmlFor="2fa-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Two-Factor Authentication (OTP)
                                </label>
                                <input
                                    id="2fa-code"
                                    type="text"
                                    maxLength={6}
                                    value={twoFactorToken}
                                    onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, ''))}
                                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 dark:border-slate-700 placeholder-gray-500 dark:placeholder:text-gray-400 text-gray-900 dark:text-white bg-white dark:bg-slate-800 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm tracking-widest text-center text-xl"
                                    placeholder="000000"
                                    autoFocus
                                />
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                                    Enter the 6-digit code sent to your email.
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
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                                Remember me
                            </label>

                        </div>

                        <div className="text-sm">
                            <Link href="/password-reset/request" className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500">
                                Forgot your password?
                            </Link>

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
                            <div className="w-full border-t border-gray-300 dark:border-slate-800" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-gray-50 dark:bg-slate-950 text-gray-500 dark:text-gray-400">
                                Or continue with
                            </span>
                        </div>

                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <Button variant="outline" fullWidth onClick={() => window.location.href = resolveApiPath('/auth/google')}>
                            Google
                        </Button>
                        <Button variant="outline" fullWidth onClick={() => window.location.href = resolveApiPath('/auth/facebook')}>
                            Facebook
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
