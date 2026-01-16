import { useAppDispatch, useAppSelector } from '../store/hooks';
import { logout } from '../store/authSlice';
import { useRouter } from 'next/navigation';

export const useAuth = () => {
    const dispatch = useAppDispatch();
    const router = useRouter();
    const { user, isAuthenticated, isLoading, error } = useAppSelector((state) => state.auth);

    const handleLogout = () => {
        dispatch(logout());
        router.push('/login');
    };

    const hasRole = (requiredRole: string | string[]) => {
        if (!user) return false;
        if (Array.isArray(requiredRole)) {
            return requiredRole.includes(user.role);
        }
        return user.role === requiredRole;
    };

    return {
        user,
        isAuthenticated,
        isLoading,
        error,
        logout: handleLogout,
        hasRole,
    };
};
