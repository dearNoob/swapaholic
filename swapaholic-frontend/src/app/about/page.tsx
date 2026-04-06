'use client';

import React, { useEffect, useState } from 'react';
import { contentApi } from '../../api/content';
import { FaUsers, FaInfoCircle } from 'react-icons/fa';

export default function AboutPage() {
    const [content, setContent] = useState<{ title: string; body: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchContent = async () => {
            try {
                const data = await contentApi.getContent('about');
                setContent(data);
            } catch (error) {
                console.error('Error fetching about content:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchContent();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-16 px-4 sm:px-6 lg:px-8 tracking-tight">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12 animate-fade-in">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tighter">
                        {content?.title || 'About Us'}
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 font-light max-w-2xl mx-auto leading-relaxed">
                        Discover the story behind Swapaholic.
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-900 shadow-2xl rounded-[2.5rem] overflow-hidden border border-slate-200/60 dark:border-slate-800/60 animate-slide-up">
                    <div className="p-8 md:p-16">
                        {content?.body ? (
                            <div 
                                className="prose prose-slate dark:prose-invert max-w-none 
                                    prose-headings:text-slate-900 dark:prose-headings:text-white 
                                    prose-p:text-slate-600 dark:prose-p:text-slate-400 
                                    prose-strong:text-slate-900 dark:prose-strong:text-white
                                    prose-li:text-slate-600 dark:prose-li:text-slate-400
                                    prose-headings:tracking-tight prose-headings:font-bold
                                    [&>h3]:text-2xl [&>h3]:mt-10 [&>h3]:mb-4
                                    [&>p]:mb-6 [&>p]:leading-relaxed [&>p]:text-lg [&>p]:font-light"
                                dangerouslySetInnerHTML={{ __html: content.body }} 
                            />
                        ) : (
                            <div className="text-center py-20">
                                <FaInfoCircle className="mx-auto text-4xl text-slate-300 dark:text-slate-700 mb-4" />
                                <p className="text-slate-500 dark:text-slate-500 italic">No content has been published yet. Please check back later.</p>
                            </div>
                        )}

                        <div className="pt-12 mt-16 border-t border-slate-100 dark:border-slate-800/60 text-center">
                            <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tracking-wide uppercase">
                                Join the Re-Commerce Revolution
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
