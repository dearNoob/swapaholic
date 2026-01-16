// src/app/onboarding/page.tsx
import React from 'react';
import WelcomeWizard from '@/components/onboarding/WelcomeWizard';
import GuidedTour from '@/components/onboarding/GuidedTour';
import ProfileCompletionPrompt from '@/components/onboarding/ProfileCompletionPrompt';
import FirstTimeSellerGuide from '@/components/onboarding/FirstTimeSellerGuide';
import TutorialTooltip from '@/components/onboarding/TutorialTooltip';

export default function OnboardingPage() {
    return (
        <div className="p-6 space-y-8">
            <WelcomeWizard />
            <GuidedTour />
            <ProfileCompletionPrompt />
            <FirstTimeSellerGuide />
            <TutorialTooltip message="This is a tutorial tooltip example" />
        </div>
    );
}
