'use client';

import React, { useState } from 'react';
import { FaLock, FaEye, FaEyeSlash, FaSave, FaUserShield } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface PrivacySettings {
    profileVisibility: 'public' | 'friends' | 'private';
    showEmail: boolean;
    showPhone: boolean;
    showLocation: boolean;
    showOnlineStatus: boolean;
    showBidHistory: boolean;
    showWonAuctions: boolean;
    showFollowers: boolean;
    showFollowing: boolean;
    allowMessages: 'everyone' | 'followers' | 'none';
    searchEngineIndexing: boolean;
    showInRecommendations: boolean;
}

const defaultSettings: PrivacySettings = {
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
    showLocation: true,
    showOnlineStatus: true,
    showBidHistory: false,
    showWonAuctions: true,
    showFollowers: true,
    showFollowing: true,
    allowMessages: 'everyone',
    searchEngineIndexing: true,
    showInRecommendations: true
};

export default function PrivacySettings() {
    const [settings, setSettings] = useState<PrivacySettings>(defaultSettings);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleToggle = (key: keyof PrivacySettings) => {
        if (typeof settings[key] === 'boolean') {
            setSettings(prev => ({ ...prev, [key]: !prev[key] }));
            setHasChanges(true);
        }
    };

    const handleSelect = (key: keyof PrivacySettings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // TODO: API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success('Privacy settings saved!');
            setHasChanges(false);
        } catch (error) {
            toast.error('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
        <button
            onClick={onChange}
            className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${enabled ? 'bg-indigo-600' : 'bg-gray-300'}
      `}
        >
            <span
                className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${enabled ? 'translate-x-6' : 'translate-x-1'}
        `}
            />
        </button>
    );

    return (
        <div className="max-w-4xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FaUserShield className="text-indigo-600" />
                        Privacy Settings
                    </h2>
                    <p className="text-gray-600 mt-1">
                        Control who can see your information and activity
                    </p>
                </div>

                {hasChanges && (
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="
              px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold
              hover:bg-indigo-700 transition flex items-center gap-2
              disabled:opacity-50 disabled:cursor-not-allowed
            "
                    >
                        <FaSave />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                )}
            </div>

            <div className="space-y-6">
                {/* Profile Visibility */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile Visibility</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Who can see your profile?
                            </label>
                            <select
                                value={settings.profileVisibility}
                                onChange={(e) => handleSelect('profileVisibility', e.target.value)}
                                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value="public">Everyone (Public)</option>
                                <option value="friends">Followers Only</option>
                                <option value="private">Only Me (Private)</option>
                            </select>
                            <p className="text-xs text-gray-500 mt-1">
                                {settings.profileVisibility === 'public' && 'Your profile is visible to everyone'}
                                {settings.profileVisibility === 'friends' && 'Only your followers can see your profile'}
                                {settings.profileVisibility === 'private' && 'Your profile is hidden from others'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Contact Information */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900">Show Email Address</p>
                                <p className="text-sm text-gray-500">Let others see your email on your profile</p>
                            </div>
                            <ToggleSwitch
                                enabled={settings.showEmail}
                                onChange={() => handleToggle('showEmail')}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900">Show Phone Number</p>
                                <p className="text-sm text-gray-500">Let others see your phone on your profile</p>
                            </div>
                            <ToggleSwitch
                                enabled={settings.showPhone}
                                onChange={() => handleToggle('showPhone')}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900">Show Location</p>
                                <p className="text-sm text-gray-500">Display your city/region on your profile</p>
                            </div>
                            <ToggleSwitch
                                enabled={settings.showLocation}
                                onChange={() => handleToggle('showLocation')}
                            />
                        </div>
                    </div>
                </div>

                {/* Activity & Stats */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity & Statistics</h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900">Show Online Status</p>
                                <p className="text-sm text-gray-500">Display when you're online</p>
                            </div>
                            <ToggleSwitch
                                enabled={settings.showOnlineStatus}
                                onChange={() => handleToggle('showOnlineStatus')}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900">Show Bid History</p>
                                <p className="text-sm text-gray-500">Let others see your bidding activity</p>
                            </div>
                            <ToggleSwitch
                                enabled={settings.showBidHistory}
                                onChange={() => handleToggle('showBidHistory')}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900">Show Won Auctions</p>
                                <p className="text-sm text-gray-500">Display auctions you've won</p>
                            </div>
                            <ToggleSwitch
                                enabled={settings.showWonAuctions}
                                onChange={() => handleToggle('showWonAuctions')}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900">Show Followers</p>
                                <p className="text-sm text-gray-500">Display your followers list</p>
                            </div>
                            <ToggleSwitch
                                enabled={settings.showFollowers}
                                onChange={() => handleToggle('showFollowers')}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900">Show Following</p>
                                <p className="text-sm text-gray-500">Display who you're following</p>
                            </div>
                            <ToggleSwitch
                                enabled={settings.showFollowing}
                                onChange={() => handleToggle('showFollowing')}
                            />
                        </div>
                    </div>
                </div>

                {/* Communication */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Communication</h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Who can send you messages?
                        </label>
                        <select
                            value={settings.allowMessages}
                            onChange={(e) => handleSelect('allowMessages', e.target.value)}
                            className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="everyone">Everyone</option>
                            <option value="followers">Followers Only</option>
                            <option value="none">No One</option>
                        </select>
                    </div>
                </div>

                {/* Platform Visibility */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Visibility</h3>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900">Search Engine Indexing</p>
                                <p className="text-sm text-gray-500">Allow search engines to find your profile</p>
                            </div>
                            <ToggleSwitch
                                enabled={settings.searchEngineIndexing}
                                onChange={() => handleToggle('searchEngineIndexing')}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-gray-900">Show in Recommendations</p>
                                <p className="text-sm text-gray-500">Appear in "People you may know"</p>
                            </div>
                            <ToggleSwitch
                                enabled={settings.showInRecommendations}
                                onChange={() => handleToggle('showInRecommendations')}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
