'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { FaShieldAlt, FaCheck, FaUser, FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';
import { useAppSelector, useAppDispatch } from '../../../store/hooks';
import { updateUser } from '../../../store/authSlice';
import { authApi } from '../../../api/auth';
import { useRequireAdminAuth } from '../../../hooks/useRequireAdminAuth';

// Profile Validation Schema
const profileSchema = yup.object({
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    phone: yup.string().required('Phone is required'),
    address: yup.string().required('Address is required'),
}).required();

// Password Validation Schema
const passwordSchema = yup.object({
    currentPassword: yup.string().required('Current password is required'),
    newPassword: yup.string()
        .required('New password is required')
        .min(8, 'Password must be at least 8 characters'),
    confirmPassword: yup.string()
        .oneOf([yup.ref('newPassword')], 'Passwords must match')
        .required('Confirm password is required'),
}).required();

interface ProfileFormData {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
}

interface PasswordFormData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export default function AdminProfilePage() {
    const { isLoading: isAuthLoading, isAdmin } = useRequireAdminAuth();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);

    const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const {
        register: registerProfile,
        handleSubmit: handleProfileSubmit,
        formState: { errors: profileErrors },
        reset: resetProfile
    } = useForm<ProfileFormData>({
        resolver: yupResolver(profileSchema) as any,
        defaultValues: {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            phone: user?.phone || '',
            address: user?.address || '',
        },
    });

    const {
        register: registerPassword,
        handleSubmit: handlePasswordSubmit,
        formState: { errors: passwordErrors },
        reset: resetPassword
    } = useForm<PasswordFormData>({
        resolver: yupResolver(passwordSchema),
    });

    useEffect(() => {
        if (user) {
            resetProfile({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.phone || '',
                address: user.address || '',
            });
        }
    }, [user, resetProfile]);

    const onProfileSubmit = async (data: ProfileFormData) => {
        setProfileLoading(true);
        try {
            const response = await authApi.updateProfile(data);
            dispatch(updateUser(response.user));
            toast.success('Profile updated successfully!');
            setIsEditingProfile(false);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setProfileLoading(false);
        }
    };

    const onPasswordSubmit = async (data: PasswordFormData) => {
        setPasswordLoading(true);
        try {
            await authApi.changePassword({
                currentPassword: data.currentPassword,
                newPassword: data.newPassword
            });
            toast.success('Password changed successfully!');
            setIsChangingPassword(false);
            resetPassword();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to change password');
        } finally {
            setPasswordLoading(false);
        }
    };

    if (isAuthLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
            </div>
        );
    }

    const getInitials = () => {
        if (!user) return 'A';
        return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'A';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/30">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl text-white">
                            <FaUser className="text-lg" />
                        </div>
                        Admin Profile
                    </h1>
                    <p className="text-gray-500 mt-2">Manage your account information and security settings</p>
                </div>

                {/* Profile Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold backdrop-blur-sm">
                                {getInitials()}
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">
                                    {user?.firstName} {user?.lastName}
                                </h2>
                                <p className="text-indigo-200 text-sm">{user?.email}</p>
                                <span className="inline-flex items-center mt-2 px-3 py-1 bg-white/20 text-white text-xs font-medium rounded-full backdrop-blur-sm">
                                    <FaShieldAlt className="mr-1.5" /> Administrator
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`${activeTab === 'profile'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all`}
                        >
                            Profile Information
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`${activeTab === 'security'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all`}
                        >
                            Security
                        </button>
                    </nav>
                </div>

                {/* Profile Tab */}
                {activeTab === 'profile' && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="px-6 py-5 flex justify-between items-center border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
                                <p className="text-sm text-gray-500 mt-1">Update your personal details</p>
                            </div>
                            {!isEditingProfile && (
                                <button
                                    onClick={() => setIsEditingProfile(true)}
                                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-all"
                                >
                                    Edit Profile
                                </button>
                            )}
                        </div>

                        {isEditingProfile ? (
                            <form onSubmit={handleProfileSubmit(onProfileSubmit as any)} className="p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                        <input
                                            {...registerProfile('firstName')}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                                        />
                                        {profileErrors.firstName && <p className="text-red-500 text-xs mt-1">{profileErrors.firstName.message}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                        <input
                                            {...registerProfile('lastName')}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                                        />
                                        {profileErrors.lastName && <p className="text-red-500 text-xs mt-1">{profileErrors.lastName.message}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                        <input
                                            {...registerProfile('phone')}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                                        />
                                        {profileErrors.phone && <p className="text-red-500 text-xs mt-1">{profileErrors.phone.message}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                        <input
                                            {...registerProfile('address')}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                                        />
                                        {profileErrors.address && <p className="text-red-500 text-xs mt-1">{profileErrors.address.message}</p>}
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setIsEditingProfile(false); resetProfile(); }}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={profileLoading}
                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
                                    >
                                        {profileLoading ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                <div className="px-6 py-4 flex items-center gap-3">
                                    <FaUser className="text-gray-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500">Full Name</p>
                                        <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                                    </div>
                                </div>
                                <div className="px-6 py-4 flex items-center gap-3">
                                    <FaEnvelope className="text-gray-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500">Email</p>
                                        <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                                    </div>
                                </div>
                                <div className="px-6 py-4 flex items-center gap-3">
                                    <FaPhone className="text-gray-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500">Phone</p>
                                        <p className="text-sm font-medium text-gray-900">{user?.phone || 'Not provided'}</p>
                                    </div>
                                </div>
                                <div className="px-6 py-4 flex items-center gap-3">
                                    <FaMapMarkerAlt className="text-gray-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500">Address</p>
                                        <p className="text-sm font-medium text-gray-900">{user?.address || 'Not provided'}</p>
                                    </div>
                                </div>
                                <div className="px-6 py-4 flex items-center gap-3">
                                    <FaShieldAlt className="text-gray-400 flex-shrink-0" />
                                    <div>
                                        <p className="text-xs text-gray-500">Role</p>
                                        <p className="text-sm font-medium text-gray-900 capitalize">{user?.role}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                        <div className="px-6 py-5 flex justify-between items-center border-b border-gray-100">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Change Password</h3>
                                <p className="text-sm text-gray-500 mt-1">Keep your account secure with a strong password</p>
                            </div>
                            {!isChangingPassword && (
                                <button
                                    onClick={() => setIsChangingPassword(true)}
                                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-all"
                                >
                                    Change Password
                                </button>
                            )}
                        </div>

                        {isChangingPassword && (
                            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="p-6">
                                <div className="space-y-4 max-w-md">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                        <input
                                            type="password"
                                            {...registerPassword('currentPassword')}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                                        />
                                        {passwordErrors.currentPassword && <p className="text-red-500 text-xs mt-1">{passwordErrors.currentPassword.message}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                        <input
                                            type="password"
                                            {...registerPassword('newPassword')}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                                        />
                                        {passwordErrors.newPassword && <p className="text-red-500 text-xs mt-1">{passwordErrors.newPassword.message}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                        <input
                                            type="password"
                                            {...registerPassword('confirmPassword')}
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm text-gray-900"
                                        />
                                        {passwordErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{passwordErrors.confirmPassword.message}</p>}
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setIsChangingPassword(false); resetPassword(); }}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={passwordLoading}
                                        className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
                                    >
                                        {passwordLoading ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
