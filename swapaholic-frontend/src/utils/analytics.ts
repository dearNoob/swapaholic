// Analytics tracking utility
// Supports: Google Analytics, Mixpanel, custom analytics

type EventCategory = 'user' | 'product' | 'bid' | 'order' | 'navigation' | 'engagement';

interface AnalyticsEvent {
    category: EventCategory;
    action: string;
    label?: string;
    value?: number;
    properties?: Record<string, any>;
}

interface ConversionFunnel {
    name: string;
    steps: string[];
    userId?: string;
}

class Analytics {
    private static instance: Analytics;
    private userId: string | null = null;
    private sessionId: string;
    private funnels: Map<string, { steps: string[]; currentStep: number; startTime: number }> = new Map();

    private constructor() {
        this.sessionId = this.generateSessionId();
        this.initializeTracking();
    }

    public static getInstance(): Analytics {
        if (!Analytics.instance) {
            Analytics.instance = new Analytics();
        }
        return Analytics.instance;
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private initializeTracking() {
        // Track page views
        if (typeof window !== 'undefined') {
            // Track initial page load
            this.trackPageView(window.location.pathname);

            // Track route changes (for SPAs)
            let lastPath = window.location.pathname;
            const observer = new MutationObserver(() => {
                if (window.location.pathname !== lastPath) {
                    lastPath = window.location.pathname;
                    this.trackPageView(lastPath);
                }
            });

            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    public setUser(userId: string, properties?: Record<string, any>) {
        this.userId = userId;

        // Send to analytics providers
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('config', 'GA_MEASUREMENT_ID', {
                user_id: userId,
                ...properties
            });
        }

        // Mixpanel
        if (typeof window !== 'undefined' && (window as any).mixpanel) {
            (window as any).mixpanel.identify(userId);
            if (properties) {
                (window as any).mixpanel.people.set(properties);
            }
        }
    }

    public trackEvent(event: AnalyticsEvent) {
        const enrichedEvent = {
            ...event,
            userId: this.userId,
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            url: typeof window !== 'undefined' ? window.location.href : ''
        };

        // Google Analytics 4
        if (typeof window !== 'undefined' && (window as any).gtag) {
            (window as any).gtag('event', event.action, {
                event_category: event.category,
                event_label: event.label,
                value: event.value,
                ...event.properties
            });
        }

        // Mixpanel
        if (typeof window !== 'undefined' && (window as any).mixpanel) {
            (window as any).mixpanel.track(event.action, enrichedEvent);
        }

        // Custom analytics endpoint
        this.sendToBackend(enrichedEvent);

        // Console log in development
        if (process.env.NODE_ENV === 'development') {
            console.log('[Analytics]', enrichedEvent);
        }
    }

    public trackPageView(path: string) {
        this.trackEvent({
            category: 'navigation',
            action: 'page_view',
            label: path,
            properties: {
                page_title: typeof document !== 'undefined' ? document.title : '',
                referrer: typeof document !== 'undefined' ? document.referrer : ''
            }
        });
    }

    // Conversion funnel tracking
    public startFunnel(funnelName: string, steps: string[]) {
        this.funnels.set(funnelName, {
            steps,
            currentStep: 0,
            startTime: Date.now()
        });

        this.trackEvent({
            category: 'engagement',
            action: 'funnel_start',
            label: funnelName
        });
    }

    public trackFunnelStep(funnelName: string, stepName: string) {
        const funnel = this.funnels.get(funnelName);
        if (!funnel) {
            console.warn(`Funnel ${funnelName} not started`);
            return;
        }

        const stepIndex = funnel.steps.indexOf(stepName);
        if (stepIndex === -1) {
            console.warn(`Step ${stepName} not found in funnel ${funnelName}`);
            return;
        }

        funnel.currentStep = stepIndex + 1;

        this.trackEvent({
            category: 'engagement',
            action: 'funnel_step',
            label: funnelName,
            properties: {
                step: stepName,
                step_index: stepIndex,
                time_elapsed: Date.now() - funnel.startTime
            }
        });

        // Check if funnel completed
        if (stepIndex === funnel.steps.length - 1) {
            this.completeFunnel(funnelName);
        }
    }

    private completeFunnel(funnelName: string) {
        const funnel = this.funnels.get(funnelName);
        if (!funnel) return;

        const duration = Date.now() - funnel.startTime;

        this.trackEvent({
            category: 'engagement',
            action: 'funnel_complete',
            label: funnelName,
            value: duration,
            properties: {
                steps_completed: funnel.steps.length,
                duration_ms: duration
            }
        });

        this.funnels.delete(funnelName);
    }

    // Specific tracking methods for common events
    public trackProductView(productId: string, productName: string) {
        this.trackEvent({
            category: 'product',
            action: 'view_product',
            label: productName,
            properties: { product_id: productId }
        });
    }

    public trackBidPlaced(productId: string, bidAmount: number) {
        this.trackEvent({
            category: 'bid',
            action: 'place_bid',
            value: bidAmount,
            properties: { product_id: productId }
        });
    }

    public trackPurchase(orderId: string, amount: number, items: any[]) {
        this.trackEvent({
            category: 'order',
            action: 'purchase',
            value: amount,
            properties: {
                order_id: orderId,
                items: items,
                item_count: items.length
            }
        });
    }

    public trackSearch(query: string, resultsCount: number) {
        this.trackEvent({
            category: 'engagement',
            action: 'search',
            label: query,
            value: resultsCount
        });
    }

    public trackSignup(method: 'email' | 'google' | 'facebook') {
        this.trackEvent({
            category: 'user',
            action: 'signup',
            label: method
        });
    }

    public trackLogin(method: 'email' | 'google' | 'facebook') {
        this.trackEvent({
            category: 'user',
            action: 'login',
            label: method
        });
    }

    private async sendToBackend(event: any) {
        try {
            await fetch('/api/analytics/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(event)
            });
        } catch (error) {
            // Silently fail - analytics should not break the app
            console.error('Analytics error:', error);
        }
    }
}

// Export singleton instance
export const analytics = Analytics.getInstance();

// React hook for analytics
export function useAnalytics() {
    const trackEvent = (event: AnalyticsEvent) => {
        analytics.trackEvent(event);
    };

    const trackClick = (element: string, location?: string) => {
        analytics.trackEvent({
            category: 'engagement',
            action: 'click',
            label: element,
            properties: { location }
        });
    };

    const trackFormSubmit = (formName: string, success: boolean) => {
        analytics.trackEvent({
            category: 'engagement',
            action: 'form_submit',
            label: formName,
            properties: { success }
        });
    };

    return {
        trackEvent,
        trackClick,
        trackFormSubmit,
        trackProductView: analytics.trackProductView.bind(analytics),
        trackBidPlaced: analytics.trackBidPlaced.bind(analytics),
        trackPurchase: analytics.trackPurchase.bind(analytics),
        trackSearch: analytics.trackSearch.bind(analytics),
        startFunnel: analytics.startFunnel.bind(analytics),
        trackFunnelStep: analytics.trackFunnelStep.bind(analytics)
    };
}
