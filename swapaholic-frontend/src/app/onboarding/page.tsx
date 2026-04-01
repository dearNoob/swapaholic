'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaStore, FaGavel, FaBoxOpen, FaStar, FaCheckCircle, FaArrowRight, FaArrowLeft } from 'react-icons/fa';
import { useAppSelector } from '@/store/hooks';

const ONBOARDING_STEPS = [
    {
        id: 'welcome',
        title: 'Welcome to Swapaholic! 🎉',
        description: 'Your premier destination for buying and selling second-hand goods securely.',
        icon: FaBoxOpen,
        color: 'bg-indigo-500',
        content: 'We use an escrow system to ensure every transaction is safe. When you buy, your money is held securely until you receive and verify the item.'
    },
    {
        id: 'buying',
        title: 'How to Buy & Bid',
        description: 'Find amazing deals through direct purchase or competitive bidding.',
        icon: FaGavel,
        color: 'bg-blue-500',
        content: 'Browse categories, filter by condition, and place strategic bids. Remember, bids are binding commitments to purchase!'
    },
    {
        id: 'selling',
        title: 'Start Selling',
        description: 'Turn your unused items into cash by creating your own store.',
        icon: FaStore,
        color: 'bg-green-500',
        content: 'Take clear photos, write detailed descriptions, and choose whether to sell instantly or run an auction.'
    },
    {
        id: 'reputation',
        title: 'Build Your Reputation',
        description: 'Trust is the foundation of our community.',
        icon: FaStar,
        color: 'bg-orange-500',
        content: 'Leave honest reviews after transactions. High-rated sellers get more visibility and trusted buyer badges.'
    }
];

export default function OnboardingPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const router = useRouter();
    const { user } = useAppSelector((state) => state.auth);

    const handleNext = () => {
        if (currentStep < ONBOARDING_STEPS.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            // Finish onboarding
            router.push(user?.role === 'seller' ? '/seller/dashboard' : '/dashboard');
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const step = ONBOARDING_STEPS[currentStep];
    const Icon = step.icon;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden min-h-[500px] flex flex-col">
                {/* Progress Bar */}
                <div className="h-2 bg-gray-100 w-full">
                    <div 
                        className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                        style={{ width: `${((currentStep + 1) / ONBOARDING_STEPS.length) * 100}%` }}
                    />
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-fade-in key={step.id}">
                    <div className={`w-24 h-24 ${step.color} rounded-2xl flex items-center justify-center shadow-lg mb-8 transform hover:scale-105 transition duration-300`}>
                        <Icon className="text-white text-4xl" />
                    </div>
                    
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
                        {step.title}
                    </h1>
                    
                    <p className="text-xl text-gray-500 mb-6 font-medium">
                        {step.description}
                    </p>

                    <p className="text-gray-600 max-w-lg leading-relaxed text-lg">
                        {step.content}
                    </p>
                </div>

                {/* Footer Controls */}
                <div className="border-t border-gray-100 p-6 bg-gray-50 flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        className={`flex items-center gap-2 px-6 py-3 font-medium rounded-lg transition ${
                            currentStep === 0 
                                ? 'text-gray-400 cursor-not-allowed opacity-50' 
                                : 'text-gray-600 hover:bg-gray-200 bg-gray-100'
                        }`}
                        disabled={currentStep === 0}
                    >
                        <FaArrowLeft /> Back
                    </button>

                    <div className="flex gap-2">
                        {ONBOARDING_STEPS.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                    idx === currentStep ? 'bg-indigo-600 w-6' : 'bg-gray-300'
                                }`} 
                            />
                        ))}
                    </div>

                    <button
                        onClick={handleNext}
                        className="flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition transform hover:-translate-y-0.5"
                    >
                        {currentStep === ONBOARDING_STEPS.length - 1 ? (
                            <>Get Started <FaCheckCircle /></>
                        ) : (
                            <>Next <FaArrowRight /></>
                        )}
                    </button>
                </div>
            </div>

            <button 
                onClick={() => router.push(user?.role === 'seller' ? '/seller/dashboard' : '/dashboard')}
                className="mt-8 text-gray-500 hover:text-gray-900 font-medium transition"
            >
                Skip onboarding
            </button>
        </div>
    );
}
