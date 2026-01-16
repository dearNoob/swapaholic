// src/components/payments/StripeCheckoutButton.tsx
import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    PaymentElement,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
import { toast } from 'react-toastify';
import { paymentsApi } from '../../api/payments';

// Initialize Stripe outside component to avoid recreation
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

interface CheckoutFormProps {
    onSuccess: (paymentId: string) => void;
    amount: number;
}

const CheckoutForm = ({ onSuccess, amount }: CheckoutFormProps) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsLoading(true);
        setErrorMessage(null);

        try {
            const { error, paymentIntent } = await stripe.confirmPayment({
                elements,
                redirect: 'if_required',
            });

            if (error) {
                setErrorMessage(error.message || 'Payment failed');
                toast.error(error.message || 'Payment failed');
            } else if (paymentIntent && paymentIntent.status === 'succeeded') {
                toast.success('Payment successful!');
                // We need to pass the payment ID back, but confirmPayment doesn't return our internal ID.
                // In a real app, we might store the internal ID in state from the initiation step.
                // For now, we'll assume the parent handles the success flow or we pass the intent ID.
                onSuccess(paymentIntent.id);
            }
        } catch (err: any) {
            console.error('Payment error:', err);
            setErrorMessage('An unexpected error occurred.');
            toast.error('An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <PaymentElement />
            {errorMessage && (
                <div className="text-red-600 text-sm">{errorMessage}</div>
            )}
            <button
                type="submit"
                disabled={!stripe || isLoading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
                {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                    `Pay ৳${amount.toFixed(2)}`
                )}
            </button>
        </form>
    );
};

interface StripeCheckoutButtonProps {
    orderId: string;
    amount: number;
    onSuccess: () => void;
}

export default function StripeCheckoutButton({ orderId, amount, onSuccess }: StripeCheckoutButtonProps) {
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [paymentId, setPaymentId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleInitiatePayment = async () => {
        setIsLoading(true);
        try {
            const response = await paymentsApi.initiate({ orderId, method: 'stripe' });
            setClientSecret(response.clientSecret || null);
            setPaymentId(response.id);
        } catch (error: any) {
            console.error('Initiate payment error:', error);
            toast.error(error.response?.data?.message || 'Failed to initiate payment');
        } finally {
            setIsLoading(false);
        }
    };

    const handlePaymentSuccess = async (stripePaymentIntentId: string) => {
        if (!paymentId) return;

        try {
            await paymentsApi.process({
                paymentId,
                details: { stripePaymentIntentId }
            });
            onSuccess();
        } catch (error) {
            console.error('Process payment error:', error);
            toast.error('Payment confirmed but failed to update order status. Please contact support.');
        }
    };

    if (!clientSecret) {
        return (
            <button
                onClick={handleInitiatePayment}
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50 flex justify-center items-center gap-2"
            >
                {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                    'Pay with Card'
                )}
            </button>
        );
    }

    return (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm onSuccess={handlePaymentSuccess} amount={amount} />
            </Elements>
        </div>
    );
}
