import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAppDispatch } from '../../store/hooks';
import { setCredentials } from '../../store/authSlice';
import { toast } from 'react-toastify';

export const OAuthCallback = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useAppDispatch();

    useEffect(() => {
        const token = searchParams.get('token');
        const userStr = searchParams.get('user');

        if (token && userStr) {
            try {
                const user = JSON.parse(decodeURIComponent(userStr));
                dispatch(setCredentials({ user, accessToken: token }));
                toast.success('Login successful!');
                router.push('/dashboard');
            } catch (error) {
                console.error('Failed to parse user data', error);
                toast.error('Login failed');
                router.push('/login');
            }
        } else {
            // If no token, maybe it failed
            const error = searchParams.get('error');
            if (error) {
                toast.error(error);
            }
            router.push('/login');
        }
    }, [searchParams, dispatch, router]);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );
};
