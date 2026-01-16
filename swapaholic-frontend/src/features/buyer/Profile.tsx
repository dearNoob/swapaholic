import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { FaCreditCard, FaTrash, FaPlus, FaPaypal, FaUniversity, FaCheck } from 'react-icons/fa';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { setUser } from '../../store/userSlice';
import { authApi } from '../../api/auth';
import { paymentApi } from '../../api/payment';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import TwoFactorAuth from '../../components/settings/TwoFactorAuth';

const profileSchema = yup.object({
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    phone: yup.string().required('Phone is required'),
    address: yup.string().required('Address is required'),
}).required();

const passwordSchema = yup.object({
    currentPassword: yup.string().required('Current password is required'),
    newPassword: yup.string().min(6, 'Password must be at least 6 characters').required('New password is required'),
    confirmPassword: yup.string().oneOf([yup.ref('newPassword')], 'Passwords must match').required('Confirm password is required'),
}).required();

type ProfileFormData = yup.InferType<typeof profileSchema>;
type PasswordFormData = yup.InferType<typeof passwordSchema>;

interface PaymentMethod {
    id: string;
    type: 'card' | 'paypal' | 'bank';
    last4?: string;
    cardBrand?: string;
    email?: string;
    accountName?: string;
    isDefault: boolean;
}

interface Transaction {
    id: string;
    type: 'payment' | 'refund' | 'payout';
    amount: number;
    status: 'completed' | 'pending' | 'failed';
    description: string;
    date: string;
}

export const Profile = () => {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([
        { id: '1', type: 'card', last4: '4242', cardBrand: 'Visa', isDefault: true },
        { id: '2', type: 'paypal', email: 'user@example.com', isDefault: false },
    ]);
    const [transactions, setTransactions] = useState<Transaction[]>([
        { id: 'txn-1', type: 'payment', amount: 150.00, status: 'completed', description: 'Won auction: Vintage Camera', date: new Date().toISOString() },
        { id: 'txn-2', type: 'payout', amount: 85.50, status: 'completed', description: 'Sale: Leather Jacket', date: new Date(Date.now() - 86400000).toISOString() },
    ]);
    const [activeTab, setActiveTab] = useState<'profile' | 'payment' | 'transactions'>('profile');

    const { register: registerProfile, handleSubmit: handleProfileSubmit, formState: { errors: profileErrors }, reset: resetProfile } = useForm<ProfileFormData>({
        resolver: yupResolver(profileSchema),
        defaultValues: {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            phone: user?.phone || '',
            address: user?.address || '',
        },
    });

    const { register: registerPassword, handleSubmit: handlePasswordSubmit, formState: { errors: passwordErrors }, reset: resetPassword } = useForm<PasswordFormData>({
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
            dispatch(setUser(response.user));
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
                newPassword: data.newPassword,
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

    const handleRemovePaymentMethod = (id: string) => {
        if (window.confirm('Are you sure you want to remove this payment method?')) {
            setPaymentMethods(prev => prev.filter(pm => pm.id !== id));
            toast.success('Payment method removed');
        }
    };

    const handleSetDefaultPayment = (id: string) => {
        setPaymentMethods(prev => prev.map(pm => ({
            ...pm,
            isDefault: pm.id === id
        })));
        toast.success('Default payment method updated');
    };

    const getPaymentIcon = (type: string) => {
        switch (type) {
            case 'card': return <FaCreditCard className="text-indigo-600" />;
            case 'paypal': return <FaPaypal className="text-blue-600" />;
            case 'bank': return <FaUniversity className="text-green-600" />;
            default: return <FaCreditCard />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'failed': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-8">
                    <nav className="-mb-px flex space-x-8">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`${activeTab === 'profile'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Profile & Security
                        </button>
                        <button
                            onClick={() => setActiveTab('payment')}
                            className={`${activeTab === 'payment'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Payment Methods
                        </button>
                        <button
                            onClick={() => setActiveTab('transactions')}
                            className={`${activeTab === 'transactions'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Transaction History
                        </button>
                    </nav>
                </div>

                {/* Profile & Security Tab */}
                {activeTab === 'profile' && (
                    <div className="space-y-6">
                        {/* Profile Information Section */}
                        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg leading-6 font-medium text-gray-900">Profile Information</h3>
                                    <p className="mt-1 max-w-2xl text-sm text-gray-500">Personal details and contact information.</p>
                                </div>
                                {!isEditingProfile && (
                                    <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)}>
                                        Edit
                                    </Button>
                                )}
                            </div>

                            {isEditingProfile ? (
                                <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="border-t border-gray-200 px-4 py-5 sm:p-6">
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <Input label="First Name" {...registerProfile('firstName')} error={profileErrors.firstName?.message} />
                                        <Input label="Last Name" {...registerProfile('lastName')} error={profileErrors.lastName?.message} />
                                        <Input label="Email" type="email" value={user?.email || ''} disabled helperText="Email cannot be changed" />
                                        <Input label="Phone" {...registerProfile('phone')} error={profileErrors.phone?.message} />
                                        <div className="sm:col-span-2">
                                            <Input label="Address" {...registerProfile('address')} error={profileErrors.address?.message} />
                                        </div>
                                    </div>
                                    <div className="mt-6 flex justify-end space-x-3">
                                        <Button type="button" variant="outline" onClick={() => { setIsEditingProfile(false); resetProfile(); }}>Cancel</Button>
                                        <Button type="submit" isLoading={profileLoading}>Save Changes</Button>
                                    </div>
                                </form>
                            ) : (
                                <div className="border-t border-gray-200">
                                    <dl>
                                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-gray-500">Full name</dt>
                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user?.firstName} {user?.lastName}</dd>
                                        </div>
                                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-gray-500">Email address</dt>
                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user?.email}</dd>
                                        </div>
                                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-gray-500">Phone number</dt>
                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user?.phone}</dd>
                                        </div>
                                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-gray-500">Address</dt>
                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user?.address}</dd>
                                        </div>
                                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-gray-500">Role</dt>
                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 capitalize">{user?.role}</dd>
                                        </div>
                                    </dl>
                                </div>
                            )}
                        </div>

                        {/* Change Password Section */}
                        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg leading-6 font-medium text-gray-900">Change Password</h3>
                                    <p className="mt-1 max-w-2xl text-sm text-gray-500">Update your password to keep your account secure.</p>
                                </div>
                                {!isChangingPassword && (
                                    <Button variant="outline" size="sm" onClick={() => setIsChangingPassword(true)}>Change Password</Button>
                                )}
                            </div>

                            {isChangingPassword && (
                                <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="border-t border-gray-200 px-4 py-5 sm:p-6">
                                    <div className="space-y-4">
                                        <Input label="Current Password" type="password" {...registerPassword('currentPassword')} error={passwordErrors.currentPassword?.message} />
                                        <Input label="New Password" type="password" {...registerPassword('newPassword')} error={passwordErrors.newPassword?.message} />
                                        <Input label="Confirm New Password" type="password" {...registerPassword('confirmPassword')} error={passwordErrors.confirmPassword?.message} />
                                    </div>
                                    <div className="mt-6 flex justify-end space-x-3">
                                        <Button type="button" variant="outline" onClick={() => { setIsChangingPassword(false); resetPassword(); }}>Cancel</Button>
                                        <Button type="submit" isLoading={passwordLoading}>Update Password</Button>
                                    </div>
                                </form>
                            )}
                        </div>
                        {/* Two-Factor Authentication Section */}
                        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                            <div className="px-4 py-5 sm:px-6">
                                <TwoFactorAuth />
                            </div>
                        </div>
                        {/* Account Statistics */}
                        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                            <div className="px-4 py-5 sm:px-6">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">Account Statistics</h3>
                            </div>
                            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                                    <div className="bg-linear-to-br from-indigo-50 to-indigo-100 overflow-hidden rounded-lg px-4 py-5 border border-indigo-200">
                                        <dt className="text-sm font-medium text-indigo-600 truncate">Total Bids</dt>
                                        <dd className="mt-1 text-3xl font-bold text-indigo-900">0</dd>
                                    </div>
                                    <div className="bg-linear-to-br from-green-50 to-green-100 overflow-hidden rounded-lg px-4 py-5 border border-green-200">
                                        <dt className="text-sm font-medium text-green-600 truncate">Won Auctions</dt>
                                        <dd className="mt-1 text-3xl font-bold text-green-900">0</dd>
                                    </div>
                                    <div className="bg-linear-to-br from-purple-50 to-purple-100 overflow-hidden rounded-lg px-4 py-5 border border-purple-200">
                                        <dt className="text-sm font-medium text-purple-600 truncate">Reviews Given</dt>
                                        <dd className="mt-1 text-3xl font-bold text-purple-900">0</dd>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Payment Methods Tab */}
                {activeTab === 'payment' && (
                    <div className="space-y-6">
                        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg leading-6 font-medium text-gray-900">Saved Payment Methods</h3>
                                    <p className="mt-1 max-w-2xl text-sm text-gray-500">Manage your payment methods for faster checkout.</p>
                                </div>
                                <Button className="flex items-center gap-2">
                                    <FaPlus /> Add Payment Method
                                </Button>
                            </div>

                            <div className="border-t border-gray-200">
                                {paymentMethods.length === 0 ? (
                                    <div className="text-center py-12">
                                        <FaCreditCard className="mx-auto h-12 w-12 text-gray-400" />
                                        <h3 className="mt-2 text-sm font-medium text-gray-900">No payment methods</h3>
                                        <p className="mt-1 text-sm text-gray-500">Get started by adding a payment method.</p>
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-gray-200">
                                        {paymentMethods.map((method) => (
                                            <li key={method.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-2xl">
                                                            {getPaymentIcon(method.type)}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-sm font-medium text-gray-900">
                                                                    {method.type === 'card' && `${method.cardBrand} •••• ${method.last4}`}
                                                                    {method.type === 'paypal' && `PayPal - ${method.email}`}
                                                                    {method.type === 'bank' && `Bank Account - ${method.accountName}`}
                                                                </p>
                                                                {method.isDefault && (
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                                                        <FaCheck className="mr-1" /> Default
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-500">
                                                                {method.type === 'card' && 'Credit Card'}
                                                                {method.type === 'paypal' && 'PayPal Account'}
                                                                {method.type === 'bank' && 'Bank Transfer'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {!method.isDefault && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => handleSetDefaultPayment(method.id)}
                                                            >
                                                                Set as Default
                                                            </Button>
                                                        )}
                                                        <button
                                                            onClick={() => handleRemovePaymentMethod(method.id)}
                                                            className="p-2 text-red-600 hover:text-red-800 transition"
                                                            title="Remove"
                                                        >
                                                            <FaTrash />
                                                        </button>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Transaction History Tab */}
                {activeTab === 'transactions' && (
                    <div className="space-y-6">
                        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                            <div className="px-4 py-5 sm:px-6">
                                <h3 className="text-lg leading-6 font-medium text-gray-900">Transaction History</h3>
                                <p className="mt-1 max-w-2xl text-sm text-gray-500">View all your payment and payout transactions.</p>
                            </div>

                            <div className="border-t border-gray-200">
                                {transactions.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-gray-500">No transactions yet</p>
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-gray-200">
                                        {transactions.map((txn) => (
                                            <li key={txn.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(txn.status)}`}>
                                                                {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {new Date(txn.date).toLocaleDateString()} at {new Date(txn.date).toLocaleTimeString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm font-medium text-gray-900">{txn.description}</p>
                                                        <p className="text-xs text-gray-500 mt-1">Transaction ID: {txn.id}</p>
                                                    </div>
                                                    <div className="text-right ml-4">
                                                        <p className={`text-lg font-bold ${txn.type === 'payment' ? 'text-red-600' :
                                                            txn.type === 'payout' ? 'text-green-600' :
                                                                'text-gray-900'
                                                            }`}>
                                                            {txn.type === 'payment' ? '-' : '+'} ৳{txn.amount.toFixed(2)}
                                                        </p>
                                                        <p className="text-xs text-gray-500 capitalize">{txn.type}</p>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
