'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { adminApi } from '../../../api/admin';
import { useRequireAdminAuth } from '../../../hooks/useRequireAdminAuth';

interface ContentSection {
    type: string;
    title: string;
    body: string;
    lastUpdated?: string;
}

export default function ContentManagementPage() {
    const [activeTab, setActiveTab] = useState<'terms' | 'privacy' | 'about'>('terms');
    const [content, setContent] = useState<ContentSection | null>(null);
    // Protect route with admin auth
    const { isLoading: isAuthLoading, isAdmin } = useRequireAdminAuth();
    const [isDataLoading, setIsDataLoading] = useState(false);

    // Combined loading state
    const isLoading = isAuthLoading || isDataLoading;

    const [isSaving, setIsSaving] = useState(false);
    const [formData, setFormData] = useState({ title: '', body: '' });

    useEffect(() => {
        if (isAdmin) {
            fetchContent(activeTab);
        }
    }, [activeTab, isAdmin]);

    const fetchContent = async (type: string) => {
        try {
            setIsDataLoading(true);
            const data = await adminApi.getContent(type);
            setContent(data);
            setFormData({ title: data.title || '', body: data.body || '' });
        } catch (err) {
            console.error('Error fetching content:', err);
            toast.error('Failed to load content');
        } finally {
            setIsDataLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSaving(true);
            const updated = await adminApi.updateContent(activeTab, formData);
            setContent(updated);
            toast.success('Content updated successfully');
        } catch (err) {
            console.error('Error saving content:', err);
            toast.error('Failed to save content');
        } finally {
            setIsSaving(false);
        }
    };

    const tabs = [
        { id: 'terms', label: 'Terms of Service' },
        { id: 'privacy', label: 'Privacy Policy' },
        { id: 'about', label: 'About Us' }
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Content Management 📝</h1>
                    <p className="mt-2 text-gray-600">Manage static pages and policies</p>
                </div>

                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {/* Tabs */}
                    <div className="border-b border-gray-200">
                        <nav className="flex -mb-px">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`flex-1 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                        ? 'border-indigo-500 text-indigo-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-6">
                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : (
                            <form onSubmit={handleSave} className="space-y-6">
                                <div>
                                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                                        Page Title
                                    </label>
                                    <input
                                        type="text"
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                        required
                                    />
                                </div>

                                <div>
                                    <label htmlFor="body" className="block text-sm font-medium text-gray-700">
                                        Content (HTML Supported)
                                    </label>
                                    <div className="mt-1">
                                        <textarea
                                            id="body"
                                            rows={15}
                                            value={formData.body}
                                            onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                            className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                                            required
                                        />
                                    </div>
                                    <p className="mt-2 text-sm text-gray-500">
                                        You can use HTML tags for formatting.
                                    </p>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-gray-200">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                    >
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
