'use client';

import React, { useState } from 'react';
import { FaBell, FaEnvelope, FaMobileAlt, FaSms, FaSave } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface NotificationSetting {
    email: boolean;
    push: boolean;
    sms: boolean;
}

interface NotificationPreferences {
    bidActivity: NotificationSetting;
    auctionWon: NotificationSetting;
    outbid: NotificationSetting;
    auctionEnding: NotificationSetting;
    newMessage: NotificationSetting;
    orderUpdates: NotificationSetting;
    priceDrops: NotificationSetting;
    newFollower: NotificationSetting;
    productReviews: NotificationSetting;
    promotions: NotificationSetting;
}

const defaultPreferences: NotificationPreferences = {
    bidActivity: { email: true, push: true, sms: false },
    auctionWon: { email: true, push: true, sms: true },
    outbid: { email: true, push: true, sms: false },
    auctionEnding: { email: true, push: true, sms: false },
    newMessage: { email: true, push: true, sms: false },
    orderUpdates: { email: true, push: true, sms: true },
    priceDrops: { email: true, push: false, sms: false },
    newFollower: { email: false, push: true, sms: false },
    productReviews: { email: true, push: true, sms: false },
    promotions: { email: false, push: false, sms: false }
};

const notificationLabels: Record<keyof NotificationPreferences, { title: string; description: string }> = {
    bidActivity: {
        title: 'Bid Activity',
        description: 'New bids on items you\'re watching'
    },
    auctionWon: {
        title: 'Auction Won',
        description: 'You won an auction'
    },
    outbid: {
        title: 'Outbid Alerts',
        description: 'Someone outbid you on an auction'
    },
    auctionEnding: {
        title: 'Auction Ending Soon',
        description: 'Auctions ending in the next hour'
    },
    newMessage: {
        title: 'New Messages',
        description: 'You received a new message'
    },
    orderUpdates: {
        title: 'Order Updates',
        description: 'Shipping and delivery updates'
    },
    priceDrops: {
        title: 'Price Drops',
        description: 'Items on your wishlist dropped in price'
    },
    newFollower: {
        title: 'New Followers',
        description: 'Someone started following you'
    },
    productReviews: {
        title: 'Product Reviews',
        description: 'Someone reviewed your product'
    },
    promotions: {
        title: 'Promotions & Updates',
        description: 'Special offers and platform news'
    }
};

export default function NotificationPreferences() {
    const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleToggle = (category: keyof NotificationPreferences, channel: keyof NotificationSetting) => {
        setPreferences(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [channel]: !prev[category][channel]
            }
        }));
        setHasChanges(true);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // TODO: API call to save preferences
            await new Promise(resolve => setTimeout(resolve, 1000));
            toast.success('Notification preferences saved!');
            setHasChanges(false);
        } catch (error) {
            toast.error('Failed to save preferences');
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
                        <FaBell className="text-indigo-600" />
                        Notification Preferences
                    </h2>
                    <p className="text-gray-600 mt-1">
                        Choose how you want to be notified about important updates
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

            {/* Notification Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-[2fr,1fr,1fr,1fr] gap-4 p-4 bg-gray-50 border-b border-gray-200 font-semibold text-sm text-gray-700">
                    <div>Notification Type</div>
                    <div className="flex items-center justify-center gap-2">
                        <FaEnvelope />
                        <span>Email</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <FaMobileAlt />
                        <span>Push</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                        <FaSms />
                        <span>SMS</span>
                    </div>
                </div>

                {/* Notification Rows */}
                <div className="divide-y divide-gray-200">
                    {(Object.keys(notificationLabels) as Array<keyof NotificationPreferences>).map((category) => {
                        const label = notificationLabels[category];
                        const settings = preferences[category];

                        return (
                            <div
                                key={category}
                                className="grid grid-cols-[2fr,1fr,1fr,1fr] gap-4 p-4 hover:bg-gray-50 transition"
                            >
                                <div>
                                    <h4 className="font-medium text-gray-900">{label.title}</h4>
                                    <p className="text-sm text-gray-500">{label.description}</p>
                                </div>
                                <div className="flex justify-center items-center">
                                    <ToggleSwitch
                                        enabled={settings.email}
                                        onChange={() => handleToggle(category, 'email')}
                                    />
                                </div>
                                <div className="flex justify-center items-center">
                                    <ToggleSwitch
                                        enabled={settings.push}
                                        onChange={() => handleToggle(category, 'push')}
                                    />
                                </div>
                                <div className="flex justify-center items-center">
                                    <ToggleSwitch
                                        enabled={settings.sms}
                                        onChange={() => handleToggle(category, 'sms')}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Additional Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">About Notifications</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>Email:</strong> Sent to your registered email address</li>
                    <li>• <strong>Push:</strong> Browser notifications when you're online</li>
                    <li>• <strong>SMS:</strong> Text messages to your phone number (standard rates may apply)</li>
                </ul>
            </div>
        </div>
    );
}
