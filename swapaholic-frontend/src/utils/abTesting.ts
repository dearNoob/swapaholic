// A/B Testing Framework with feature flags

interface Experiment {
    id: string;
    name: string;
    variants: string[];
    weights?: number[];
    active: boolean;
}

interface FeatureFlag {
    id: string;
    enabled: boolean;
    rolloutPercentage?: number;
    targetUsers?: string[];
}

type GtagTracker = (command: string, action: string, params?: Record<string, string>) => void;

class ABTesting {
    private static instance: ABTesting;
    private experiments: Map<string, Experiment> = new Map();
    private featureFlags: Map<string, FeatureFlag> = new Map();
    private userAssignments: Map<string, string> = new Map();
    private userId: string | null = null;

    private constructor() {
        this.loadFromStorage();
    }

    public static getInstance(): ABTesting {
        if (!ABTesting.instance) {
            ABTesting.instance = new ABTesting();
        }
        return ABTesting.instance;
    }

    public setUserId(userId: string) {
        this.userId = userId;
    }

    // Register an experiment
    public registerExperiment(experiment: Experiment) {
        this.experiments.set(experiment.id, experiment);
    }

    // Get variant for a user
    public getVariant(experimentId: string): string {
        const experiment = this.experiments.get(experimentId);
        if (!experiment || !experiment.active) {
            return 'control';
        }

        // Check if user already has an assignment
        const storageKey = `ab_${experimentId}`;
        const existing = this.userAssignments.get(storageKey);
        if (existing) {
            return existing;
        }

        // Assign variant based on weights
        const variant = this.assignVariant(experiment);
        this.userAssignments.set(storageKey, variant);
        this.saveToStorage();

        // Track assignment
        this.trackExperimentAssignment(experimentId, variant);

        return variant;
    }

    private assignVariant(experiment: Experiment): string {
        const weights = experiment.weights || experiment.variants.map(() => 1 / experiment.variants.length);
        const random = Math.random();
        let cumulative = 0;

        for (let i = 0; i < experiment.variants.length; i++) {
            cumulative += weights[i];
            if (random < cumulative) {
                return experiment.variants[i];
            }
        }

        return experiment.variants[0];
    }

    // Feature flags
    public registerFeatureFlag(flag: FeatureFlag) {
        this.featureFlags.set(flag.id, flag);
    }

    public isFeatureEnabled(flagId: string): boolean {
        const flag = this.featureFlags.get(flagId);
        if (!flag) return false;

        // Check if globally enabled
        if (!flag.enabled) return false;

        // Check if user is in target list
        if (flag.targetUsers && this.userId) {
            return flag.targetUsers.includes(this.userId);
        }

        // Check rollout percentage
        if (flag.rolloutPercentage !== undefined) {
            const hash = this.hashUserId(this.userId || 'anonymous');
            return hash < flag.rolloutPercentage;
        }

        return flag.enabled;
    }

    private hashUserId(userId: string): number {
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            const char = userId.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash % 100);
    }

    private trackExperimentAssignment(experimentId: string, variant: string) {
        if (typeof window !== 'undefined') {
            const analyticsWindow = window as Window & { gtag?: GtagTracker };

            analyticsWindow.gtag?.('event', 'experiment_impression', {
                experiment_id: experimentId,
                variant_id: variant
            });
        }
    }

    private loadFromStorage() {
        if (typeof window === 'undefined') return;

        const stored = localStorage.getItem('ab_assignments');
        if (stored) {
            try {
                const data = JSON.parse(stored);
                this.userAssignments = new Map(Object.entries(data));
            } catch (e) {
                console.error('Failed to load A/B assignments', e);
            }
        }
    }

    private saveToStorage() {
        if (typeof window === 'undefined') return;

        const data = Object.fromEntries(this.userAssignments);
        localStorage.setItem('ab_assignments', JSON.stringify(data));
    }
}

export const abTesting = ABTesting.getInstance();

// React hooks
export function useExperiment(experimentId: string): string {
    return abTesting.getVariant(experimentId);
}

export function useFeatureFlag(flagId: string): boolean {
    return abTesting.isFeatureEnabled(flagId);
}

// Example usage:
//
// // Register experiments
// abTesting.registerExperiment({
//   id: 'checkout_flow',
//   name: 'Checkout Flow Test',
//   variants: ['single_page', 'multi_step'],
//   weights: [0.5, 0.5],
//   active: true
// });
//
// // In component
// const variant = useExperiment('checkout_flow');
// if (variant === 'multi_step') {
//   return <MultiStepCheckout />;
// }
// return <SinglePageCheckout />;
//
// // Feature flags
// abTesting.registerFeatureFlag({
//   id: 'new_bid_ui',
//   enabled: true,
//   rolloutPercentage: 25
// });
//
// const hasNewUI = useFeatureFlag('new_bid_ui');
