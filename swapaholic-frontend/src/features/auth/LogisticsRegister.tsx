'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash, FaTruck, FaCheckCircle } from 'react-icons/fa';
import { authApi } from '../../api/auth';
import { Button } from '../../components/ui/Button';

const schema = yup.object({
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    email: yup.string().email('Invalid email').required('Email is required'),
    phone: yup.string().min(6, 'Phone must be at least 6 characters').required('Phone is required'),
    password: yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
    confirmPassword: yup.string()
        .oneOf([yup.ref('password')], 'Passwords must match')
        .required('Confirm password is required'),
    address: yup.string().optional(),
}).required();

type FormData = yup.InferType<typeof schema>;

export const LogisticsRegister = () => {
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [isRegistered, setIsRegistered] = React.useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: yupResolver(schema) as any,
    });

    const onSubmit = async (data: any) => {
        setIsLoading(true);
        try {
            const { confirmPassword, ...registerData } = data;
            await authApi.logisticsRegister(registerData);
            setIsRegistered(true);
            toast.success('Registration successful! Awaiting admin approval.');
        } catch (error: any) {
            let message = 'Registration failed. Please try again.';
            if (error?.message) {
                message = error.message;
            }
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isRegistered) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:via-teal-900 dark:to-slate-900 py-12 px-4">
                <div className="max-w-md w-full text-center space-y-6 animate-fade-in">
                    <div className="mx-auto h-20 w-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <FaCheckCircle className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">Registration Successful!</h2>
                    <div className="bg-white dark:bg-slate-800/50 backdrop-blur-sm p-6 rounded-xl border border-slate-200 dark:border-teal-700/30">
                        <p className="text-slate-600 dark:text-gray-300 mb-4">
                            Your logistics officer account has been created and is{' '}
                            <span className="text-amber-600 dark:text-amber-400 font-semibold">pending admin approval</span>.
                        </p>
                        <p className="text-slate-500 dark:text-gray-400 text-sm">
                            You will be able to login once an administrator approves your account.
                            Please check back later.
                        </p>
                    </div>
                    <button
                        onClick={() => router.push('/logistics/login')}
                        className="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-lg font-medium hover:from-teal-700 hover:to-cyan-700 transition-all shadow-lg"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-slate-50 to-slate-200 dark:from-slate-900 dark:via-teal-900 dark:to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 animate-fade-in">
                <div className="text-center">
                    <div className="mx-auto h-16 w-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-teal-500/30">
                        <FaTruck className="h-8 w-8 text-white" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
                        Register as Logistics Officer
                    </h2>
                    <p className="mt-2 text-sm text-slate-600 dark:text-gray-400">
                        Account requires admin approval before activation
                    </p>
                </div>

                <form className="mt-8 space-y-5 bg-white dark:bg-slate-800/50 backdrop-blur-sm p-8 rounded-xl border border-slate-200 dark:border-teal-700/30 shadow-2xl" onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">First Name</label>
                            <input
                                id="firstName"
                                type="text"
                                disabled={isLoading}
                                placeholder="John"
                                {...register('firstName')}
                                className="appearance-none rounded-lg block w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-gray-500 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                            />
                            {errors.firstName && <p className="mt-1 text-xs text-red-400">{String(errors.firstName.message)}</p>}
                        </div>
                        <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Last Name</label>
                            <input
                                id="lastName"
                                type="text"
                                disabled={isLoading}
                                placeholder="Doe"
                                {...register('lastName')}
                                className="appearance-none rounded-lg block w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-gray-500 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                            />
                            {errors.lastName && <p className="mt-1 text-xs text-red-400">{String(errors.lastName.message)}</p>}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="reg-email" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Email</label>
                        <input
                            id="reg-email"
                            type="email"
                            disabled={isLoading}
                            placeholder="officer@example.com"
                            {...register('email')}
                            className="appearance-none rounded-lg block w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-gray-500 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                        {errors.email && <p className="mt-1 text-xs text-red-400">{String(errors.email.message)}</p>}
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Phone</label>
                        <input
                            id="phone"
                            type="text"
                            disabled={isLoading}
                            placeholder="+880-1XXXXXXXXX"
                            {...register('phone')}
                            className="appearance-none rounded-lg block w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-gray-500 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                        {errors.phone && <p className="mt-1 text-xs text-red-400">{String(errors.phone.message)}</p>}
                    </div>

                    <div>
                        <label htmlFor="address" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Address (Optional)</label>
                        <input
                            id="address"
                            type="text"
                            disabled={isLoading}
                            placeholder="Your address"
                            {...register('address')}
                            className="appearance-none rounded-lg block w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-gray-500 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <div className="relative">
                        <label htmlFor="reg-password" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Password</label>
                        <input
                            id="reg-password"
                            type={showPassword ? "text" : "password"}
                            disabled={isLoading}
                            placeholder="Min 6 characters"
                            {...register('password')}
                            className="appearance-none rounded-lg block w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-gray-500 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all pr-12"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-9 text-gray-400 hover:text-gray-200 transition-colors" tabIndex={-1}>
                            {showPassword ? <FaEyeSlash className="h-5 w-5" /> : <FaEye className="h-5 w-5" />}
                        </button>
                        {errors.password && <p className="mt-1 text-xs text-red-400">{String(errors.password.message)}</p>}
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            disabled={isLoading}
                            placeholder="Confirm your password"
                            {...register('confirmPassword')}
                            className="appearance-none rounded-lg block w-full px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 placeholder-slate-400 dark:placeholder-gray-500 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                        />
                        {errors.confirmPassword && <p className="mt-1 text-xs text-red-400">{String(errors.confirmPassword.message)}</p>}
                    </div>

                    <Button
                        type="submit"
                        fullWidth
                        isLoading={isLoading}
                        className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-medium py-3 rounded-lg transition-all shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50"
                    >
                        {isLoading ? 'Registering...' : 'Register'}
                    </Button>
                </form>

                <div className="text-center">
                    <p className="text-sm text-gray-500">
                        Already have an account?{' '}
                        <a href="/logistics/login" className="text-teal-400 hover:text-teal-300 transition-colors">
                            Sign in
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
};
