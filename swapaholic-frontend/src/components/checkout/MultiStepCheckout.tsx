'use client';

import React, { useState } from 'react';
import { FaCheck, FaShippingFast, FaCreditCard, FaReceipt } from 'react-icons/fa';

interface CheckoutStep {
    number: number;
    title: string;
    icon: React.ElementType;
}

const steps: CheckoutStep[] = [
    { number: 1, title: 'Shipping', icon: FaShippingFast },
    { number: 2, title: 'Payment', icon: FaCreditCard },
    { number: 3, title: 'Review', icon: FaReceipt }
];

interface MultiStepCheckoutProps {
    children: React.ReactNode;
    currentStep: number;
    onStepChange: (step: number) => void;
}

export default function MultiStepCheckout({
    children,
    currentStep,
    onStepChange
}: MultiStepCheckoutProps) {
    return (
        <div className="max-w-4xl mx-auto">
            {/* Progress Indicator */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    {steps.map((step, index) => {
                        const isCompleted = currentStep > step.number;
                        const isCurrent = currentStep === step.number;
                        const Icon = step.icon;

                        return (
                            <React.Fragment key={step.number}>
                                {/* Step */}
                                <div className="flex flex-col items-center flex-1">
                                    <button
                                        onClick={() => onStepChange(step.number)}
                                        disabled={step.number > currentStep}
                                        className={`
                      w-12 h-12 rounded-full flex items-center justify-center
                      transition-all duration-300 mb-2
                      ${isCompleted
                                                ? 'bg-green-500 text-white'
                                                : isCurrent
                                                    ? 'bg-indigo-600 text-white ring-4 ring-indigo-200'
                                                    : 'bg-gray-200 text-gray-400'
                                            }
                      ${step.number <= currentStep ? 'cursor-pointer hover:scale-110' : 'cursor-not-allowed'}
                    `}
                                    >
                                        {isCompleted ? (
                                            <FaCheck className="text-lg" />
                                        ) : (
                                            <Icon className="text-lg" />
                                        )}
                                    </button>
                                    <span
                                        className={`
                      text-sm font-medium
                      ${isCurrent ? 'text-indigo-600' : isCompleted ? 'text-gray-900' : 'text-gray-400'}
                    `}
                                    >
                                        {step.title}
                                    </span>
                                </div>

                                {/* Connector Line */}
                                {index < steps.length - 1 && (
                                    <div className="flex-1 h-0.5 mx-4 mb-8">
                                        <div
                                            className={`
                        h-full transition-all duration-500
                        ${currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'}
                      `}
                                        />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>

            {/* Step Content */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                {children}
            </div>
        </div>
    );
}
