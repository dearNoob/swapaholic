import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import { FaCreditCard, FaTrash, FaPlus, FaPaypal, FaUniversity, FaCheck, FaCcVisa, FaCcMastercard, FaCcAmex } from 'react-icons/fa';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { updateUser } from '../../store/authSlice';
import { authApi } from '../../api/auth';
import { paymentsApi, PaymentMethod, Transaction } from '../../api/payments';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import TwoFactorAuth from '../../components/settings/TwoFactorAuth';

// Profile Validation Schema
const profileSchema = yup.object({
    firstName: yup.string().required('First name is required'),
    lastName: yup.string().required('Last name is required'),
    phone: yup.string().required('Phone is required'),
    address: yup.string().required('Address is required'),
    nidNumber: yup.string().nullable(),
    interests: yup.string().nullable(),
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
    nidNumber: string | null;
    interests: string | null;
}

interface PasswordFormData {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

export const Profile = () => {
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);

    // UI State
    const [activeTab, setActiveTab] = useState<'profile' | 'payment' | 'transactions'>('profile');
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Payment & Transaction State
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]); // Mock data for now
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [modalPaymentType, setModalPaymentType] = useState('card');

    // Profile Form
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
            nidNumber: user?.nidNumber || null,
            interests: user?.interests ? user.interests.join(', ') : null,
        },
    });

    // Password Form
    const {
        register: registerPassword,
        handleSubmit: handlePasswordSubmit,
        formState: { errors: passwordErrors },
        reset: resetPassword
    } = useForm<PasswordFormData>({
        resolver: yupResolver(passwordSchema),
    });

    // Update form default values when user data changes
    useEffect(() => {
        if (user) {
            resetProfile({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                phone: user.phone || '',
                address: user.address || '',
                nidNumber: user.nidNumber || null,
                interests: user.interests ? user.interests.join(', ') : null,
            });
        }
    }, [user, resetProfile]);

    // Fetch payment methods when tab is active
    useEffect(() => {
        if (activeTab === 'payment') {
            fetchPaymentMethods();
        } else if (activeTab === 'transactions') {
            fetchTransactions();
        }
    }, [activeTab]);

    const fetchPaymentMethods = async () => {
        try {
            const methods = await paymentsApi.getPaymentMethods();
            setPaymentMethods(methods);
        } catch (error) {
            console.error('Failed to fetch payment methods', error);
        }
    };

    const fetchTransactions = async () => {
        try {
            const data = await paymentsApi.getTransactions();
            setTransactions(data);
        } catch (error) {
            console.error('Failed to fetch transactions', error);
            toast.error('Failed to load transaction history');
        }
    };

    const onProfileSubmit = async (data: ProfileFormData) => {
        setProfileLoading(true);
        try {
            // Convert interests string to array and handle nulls
            const formattedData = {
                ...data,
                nidNumber: data.nidNumber || undefined, // Convert null to undefined for API
                interests: data.interests ? data.interests.split(',').map((i: string) => i.trim()) : []
            };
            const response = await authApi.updateProfile(formattedData);
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

    const handleSetDefaultPayment = async (id: string) => {
        try {
            await paymentsApi.setDefaultPaymentMethod(id);
            toast.success('Default payment method updated');
            fetchPaymentMethods();
        } catch (error: any) {
            toast.error('Failed to set default method');
        }
    };

    const handleRemovePaymentMethod = async (id: string) => {
        if (!window.confirm('Are you sure you want to remove this payment method?')) return;
        try {
            await paymentsApi.removePaymentMethod(id);
            toast.success('Payment method removed');
            fetchPaymentMethods();
        } catch (error: any) {
            toast.error('Failed to remove payment method');
        }
    };

    const getPaymentIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'card': return <FaCreditCard className="text-gray-600" />;
            case 'paypal': return <FaPaypal className="text-blue-600" />;
            case 'bank': return <FaUniversity className="text-gray-600" />;
            default: return <FaCreditCard className="text-gray-400" />;
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
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
                    {user?.isVerifiedUser && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            <FaCheck className="mr-2" /> Verified User
                        </span>
                    )}
                </div>

                {/* Profile Completion Score */}
                {user && (
                    <div className="mb-8 bg-white shadow rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700">Profile Completion</span>
                            <span className="text-sm font-medium text-indigo-600">{user.profileCompletionScore || 40}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                                style={{ width: `${user.profileCompletionScore || 40}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Add Bio (+10%), Interests (+10%), and NID (+10%) to reach 70% and get Verified!
                        </p>
                    </div>
                )}

                {/* Tabs */}
                <div className="border-b border-gray-200 mb-6">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`${activeTab === 'profile'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Profile & Security
                        </button>
                        <button
                            onClick={() => setActiveTab('payment')}
                            className={`${activeTab === 'payment'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                        >
                            Payment Methods
                        </button>
                        <button
                            onClick={() => setActiveTab('transactions')}
                            className={`${activeTab === 'transactions'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
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
                                <form onSubmit={handleProfileSubmit(onProfileSubmit as any)} className="border-t border-gray-200 px-4 py-5 sm:p-6">
                                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                        <Input label="First Name" {...registerProfile('firstName')} error={profileErrors.firstName?.message} />
                                        <Input label="Last Name" {...registerProfile('lastName')} error={profileErrors.lastName?.message} />
                                        <Input label="Email" type="email" value={user?.email || ''} disabled helperText="Email cannot be changed" />
                                        <Input label="Phone" {...registerProfile('phone')} error={profileErrors.phone?.message} />
                                        <div className="sm:col-span-2">
                                            <Input label="Address" {...registerProfile('address')} error={profileErrors.address?.message} />
                                        </div>
                                        <Input label="NID Number" {...registerProfile('nidNumber')} placeholder="National ID" />
                                        <Input label="Interests" {...registerProfile('interests')} placeholder="Coding, Gaming (comma separated)" />
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
                                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-gray-500">NID</dt>
                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{user?.nidNumber || 'Not provided'}</dd>
                                        </div>
                                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                            <dt className="text-sm font-medium text-gray-500">Interests</dt>
                                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                                {user?.interests?.length ? user.interests.join(', ') : 'None'}
                                            </dd>
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
                                <Button
                                    className="flex items-center gap-2"
                                    onClick={() => setIsPaymentModalOpen(true)}
                                >
                                    <FaPlus /> Add Payment Method
                                </Button>
                            </div>

                            <Modal
                                isOpen={isPaymentModalOpen}
                                onClose={() => setIsPaymentModalOpen(false)}
                                title="Add Payment Method"
                            >
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    const type = modalPaymentType;
                                    const data: any = { type };

                                    if (type === 'card') {
                                        data.cardNumber = formData.get('cardNumber');
                                        data.expiryMonth = formData.get('expiryMonth');
                                        data.expiryYear = formData.get('expiryYear');
                                        data.cvv = formData.get('cvv');
                                        data.cardholderName = formData.get('cardholderName');
                                    } else {
                                        data.mobileNumber = formData.get('mobileNumber');
                                        data.cardholderName = formData.get('accountName');
                                    }

                                    try {
                                        await paymentsApi.addPaymentMethod(data);
                                        toast.success('Payment method added successfully');
                                        setIsPaymentModalOpen(false);
                                        fetchPaymentMethods();
                                    } catch (err: any) {
                                        toast.error(err.response?.data?.message || 'Failed to add method');
                                    }
                                }}>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-black-700" 
                                            style={{color:"black", fontWeight:"bold", fontSize:"18px", fontStyle:"italic"}}
                                            >Method Type</label>
                                            <select
                                                name="type"
                                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-black-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                                value={modalPaymentType}
                                                onChange={(e) => setModalPaymentType(e.target.value)}
                                                style={{color:"black"}}
                                            >
                                                <option value="card">Credit/Debit Card</option>
                                                <option value="bkash">bKash</option>
                                                <option value="nagad">Nagad</option>
                                                <option value="rocket">Rocket</option>
                                            </select>
                                        </div>

                                        <div className="space-y-4">
                                            <p className="text-xs text-black-500"
                                            style={{color:"black", fontWeight:"bold", fontSize:"11px", fontStyle:"italic"}}
                                            >Enter your {modalPaymentType === 'card' ? 'card' : 'account'} details securely.</p>

                                            {modalPaymentType === 'card' ? (
                                                <>
                                                    <Input name="cardholderName" label="Cardholder Name" required />
                                                    <Input name="cardNumber" label="Card Number" placeholder="1234 5678 1234 5678" required />

                                                    <div className="flex gap-4">
                                                        <Input name="expiryMonth" label="Exp Month" placeholder="MM" className="w-1/3" required />
                                                        <Input name="expiryYear" label="Exp Year" placeholder="YY" className="w-1/3" required />
                                                        <Input name="cvv" label="CVV" placeholder="123" type="password" className="w-1/3" required />
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <Input name="accountName" label="Account Name" placeholder="Name on Account" required />
                                                    <Input name="mobileNumber" label="Mobile Number" placeholder="01XXXXXXXXX" required />
                                                </>
                                            )}
                                        </div>

                                        <div className="mt-5 sm:mt-6">
                                            <Button type="submit" className="w-full">
                                                Save Payment Method
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </Modal>

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
                                                                    {method.type === 'card' && `${method.brand} •••• ${method.last4}`}
                                                                    {method.type === 'paypal' && `PayPal`}
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
