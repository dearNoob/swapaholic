'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    FaTruck, FaUser, FaPhone, FaEnvelope, FaArrowLeft,
    FaEdit, FaSave, FaTimes, FaSpinner, FaIdBadge, FaCheckCircle
} from 'react-icons/fa';
import { logisticsApi } from '../../../api/logistics';
import { useRequireLogisticsAuth } from '../../../hooks/useRequireLogisticsAuth';
import { toast } from 'react-toastify';

export default function LogisticsProfilePage() {
    const { isLoading: isAuthLoading } = useRequireLogisticsAuth();
    const router = useRouter();

    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        phone: '',
        bio: '',
    });

    useEffect(() => {
        if (isAuthLoading) return;
        (async () => {
            try {
                setIsLoading(true);
                const res = await logisticsApi.getMyProfile();
                setProfile(res.user);
                setForm({
                    firstName: res.user.firstName || '',
                    lastName: res.user.lastName || '',
                    phone: res.user.phone || '',
                    bio: res.user.bio || '',
                });
            } catch (err: any) {
                toast.error('Failed to load profile');
            } finally {
                setIsLoading(false);
            }
        })();
    }, [isAuthLoading]);

    const handleSave = async () => {
        if (!form.firstName.trim() || !form.lastName.trim()) {
            toast.error('Name is required');
            return;
        }
        setIsSaving(true);
        try {
            const res = await logisticsApi.updateMyProfile(form);
            setProfile(res.user);
            setIsEditing(false);
            setSaveSuccess(true);
            toast.success('Profile updated successfully!');
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to save profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setForm({
            firstName: profile?.firstName || '',
            lastName: profile?.lastName || '',
            phone: profile?.phone || '',
            bio: profile?.bio || '',
        });
        setIsEditing(false);
    };

    if (isAuthLoading || isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-400">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

                {/* Back Button */}
                <button
                    onClick={() => router.push('/logistics/dashboard')}
                    className="flex items-center gap-2 text-gray-400 hover:text-gray-200 mb-6 transition-colors"
                >
                    <FaArrowLeft /> Back to Dashboard
                </button>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl shadow-lg shadow-teal-500/30">
                            <FaUser className="text-xl text-white" />
                        </div>
                        My Profile
                    </h1>
                    <p className="text-gray-400 mt-2">Manage your logistics officer account details</p>
                </div>

                {/* Profile Card */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">

                    {/* Avatar + Name Banner */}
                    <div className="bg-gradient-to-r from-teal-600/20 to-cyan-600/20 border-b border-slate-700/50 p-6 flex items-center gap-5">
                        <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-xl shadow-teal-500/30 flex-shrink-0">
                            <FaTruck className="text-white text-3xl" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {profile?.firstName} {profile?.lastName}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <FaIdBadge className="text-teal-400 text-xs" />
                                <span className="text-teal-400 text-sm font-medium">Logistics Officer</span>
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                                    profile?.accountStatus === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                }`}>
                                    {profile?.accountStatus?.replace('_', ' ')}
                                </span>
                            </div>
                        </div>
                        <div className="ml-auto">
                            {!isEditing ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-teal-600/20 border border-teal-500/30 text-teal-400 rounded-xl text-sm font-medium hover:bg-teal-600/30 transition-all"
                                >
                                    <FaEdit /> Edit Profile
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleCancel}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-600/20 border border-slate-500/30 text-gray-400 rounded-xl text-sm font-medium hover:bg-slate-600/30 transition-all"
                                    >
                                        <FaTimes /> Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition-all disabled:opacity-50"
                                    >
                                        {isSaving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Save Success Banner */}
                    {saveSuccess && (
                        <div className="flex items-center gap-2 px-6 py-3 bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 text-sm">
                            <FaCheckCircle /> Profile updated successfully!
                        </div>
                    )}

                    {/* Form Fields */}
                    <div className="p-6 space-y-5">
                        {/* Name Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">First Name</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={form.firstName}
                                        onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                                        className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                ) : (
                                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/30 rounded-xl text-gray-200 text-sm">
                                        <FaUser className="text-gray-500 text-xs" />
                                        {profile?.firstName || '—'}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Last Name</label>
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={form.lastName}
                                        onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                                        className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    />
                                ) : (
                                    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/30 rounded-xl text-gray-200 text-sm">
                                        <FaUser className="text-gray-500 text-xs" />
                                        {profile?.lastName || '—'}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Email (read-only always) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/20 border border-slate-600/50 rounded-xl text-gray-400 text-sm">
                                <FaEnvelope className="text-gray-500 text-xs" />
                                {profile?.email}
                                <span className="ml-auto text-xs text-gray-600 bg-slate-700 px-2 py-0.5 rounded-full">Cannot change</span>
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                            {isEditing ? (
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                                    placeholder="+880..."
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                />
                            ) : (
                                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/30 rounded-xl text-gray-200 text-sm">
                                    <FaPhone className="text-gray-500 text-xs" />
                                    {profile?.phone || 'Not set'}
                                </div>
                            )}
                        </div>

                        {/* Bio */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Bio <span className="text-gray-500 text-xs font-normal">(optional)</span>
                            </label>
                            {isEditing ? (
                                <textarea
                                    value={form.bio}
                                    onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                                    placeholder="Brief description about yourself..."
                                    rows={3}
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                                />
                            ) : (
                                <div className="px-4 py-2.5 bg-slate-700/30 rounded-xl text-gray-300 text-sm min-h-[60px]">
                                    {profile?.bio || <span className="text-gray-600">No bio added yet.</span>}
                                </div>
                            )}
                        </div>

                        {/* Account Info */}
                        <div className="pt-4 border-t border-slate-700/50">
                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">Account Info</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-400">
                                <div>Role: <span className="text-teal-400 font-medium ml-1">Logistics Officer</span></div>
                                <div>Joined: <span className="text-gray-300 ml-1">{profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : '—'}</span></div>
                                <div>Status: <span className={`font-medium ml-1 ${profile?.accountStatus === 'active' ? 'text-emerald-400' : 'text-amber-400'}`}>{profile?.accountStatus?.replace('_', ' ')}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
