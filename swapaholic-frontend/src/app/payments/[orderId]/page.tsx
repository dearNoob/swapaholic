'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { paymentsApi as paymentApi } from '@/api/payments';
import { ordersApi } from '@/api/orders';
import PaymentMethodSelector from '@/components/payments/PaymentMethodSelector';
import StripeCheckoutButton from '@/components/payments/StripeCheckoutButton';
import PayPalButton from '@/components/payments/PayPalButton';
import EscrowManagement from '@/components/payments/EscrowManagement';
import RefundProcessing from '@/components/payments/RefundProcessing';
import InvoiceDisplay from '@/components/payments/InvoiceDisplay';

export default function PaymentPage() {
    const params = useParams();
    const orderId = params.orderId as string;
    const [orderDetails, setOrderDetails] = useState<any>(null);
    const [selectedMethod, setSelectedMethod] = useState<'stripe' | 'paypal' | 'escrow' | 'bkash' | 'rocket' | 'nagad' | null>(null);
    const [paymentSession, setPaymentSession] = useState<any>(null);
    const [paymentStatus, setPaymentStatus] = useState<string>('');

    useEffect(() => {
        if (orderId) {
            fetchOrderDetails();
        }
    }, [orderId]);

    const fetchOrderDetails = async () => {
        try {
            const order = await ordersApi.getOrderById(orderId);
            setOrderDetails({
                id: order.id,
                amount: order.totalAmount,
                currency: 'BDT',
                description: `Order #${order.id}`,
            });
        } catch (error) {
            console.error('Error fetching order:', error);
        }
    };

    const handleMethodSelect = (method: typeof selectedMethod) => {
        setSelectedMethod(method);
    };

    const startStripePayment = async () => {
        if (!orderDetails) return;
        try {
            const payment = await paymentApi.initiate({
                orderId: orderDetails.id,
                method: 'stripe'
            });
            setPaymentSession(payment);

            const session = payment as any;
            if (session.sessionId) {
                const { loadStripe } = await import('@stripe/stripe-js');
                const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY || '');
                if (stripe) {
                    // Type assertion for Stripe compatibility
                    await (stripe as any).redirectToCheckout({ sessionId: session.sessionId });
                }
            }
        } catch (error) {
            console.error('Stripe payment error:', error);
        }
    };

    const startPayPalPayment = async () => {
        if (!orderDetails) return;
        try {
            const payment = await paymentApi.initiate({
                orderId: orderDetails.id,
                method: 'paypal'
            });
            setPaymentSession(payment);

            const paypalOrder = payment as any;
            if (paypalOrder.approveLink) {
                window.open(paypalOrder.approveLink, '_blank');
            }
        } catch (error) {
            console.error('PayPal payment error:', error);
        }
    };

    const startBkashPayment = async () => {
        if (!orderDetails) return;
        try {
            const payment = await paymentApi.initiate({
                orderId: orderDetails.id,
                method: 'bkash'
            });
            setPaymentSession(payment);

            const bkashPayment = payment as any;
            if (bkashPayment.paymentUrl) {
                window.location.href = bkashPayment.paymentUrl;
            }
        } catch (error) {
            console.error('bKash payment error:', error);
        }
    };

    const startRocketPayment = async () => {
        if (!orderDetails) return;
        try {
            const payment = await paymentApi.initiate({
                orderId: orderDetails.id,
                method: 'rocket'
            });
            setPaymentSession(payment);

            const rocketPayment = payment as any;
            if (rocketPayment.paymentUrl) {
                window.location.href = rocketPayment.paymentUrl;
            }
        } catch (error) {
            console.error('Rocket payment error:', error);
        }
    };

    const startNagadPayment = async () => {
        if (!orderDetails) return;
        try {
            const payment = await paymentApi.initiate({
                orderId: orderDetails.id,
                method: 'nagad'
            });
            setPaymentSession(payment);

            const nagadPayment = payment as any;
            if (nagadPayment.paymentUrl) {
                window.location.href = nagadPayment.paymentUrl;
            }
        } catch (error) {
            console.error('Nagad payment error:', error);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold mb-4">Payment for Order #{orderId}</h1>
            {orderDetails ? (
                <div className="space-y-4">
                    <p>{orderDetails.description}</p>
                    <p className="text-xl font-semibold">
                        Amount: {orderDetails.amount} {orderDetails.currency}
                    </p>
                    <PaymentMethodSelector onSelect={handleMethodSelect} selected={selectedMethod} />
                    {selectedMethod === 'stripe' && (
                        <StripeCheckoutButton
                            orderId={orderDetails.id}
                            amount={orderDetails.amount}
                            onSuccess={() => {
                                setPaymentStatus('completed');
                                // Optionally refresh order details or redirect
                            }}
                        />
                    )}
                    {selectedMethod === 'paypal' && (
                        <PayPalButton onPay={startPayPalPayment} />
                    )}
                    {selectedMethod === 'escrow' && (
                        <EscrowManagement orderId={orderDetails.id} amount={orderDetails.amount} />
                    )}
                    {selectedMethod === 'bkash' && (
                        <button
                            onClick={startBkashPayment}
                            className="w-full px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition font-semibold"
                        >
                            Pay with bKash
                        </button>
                    )}
                    {selectedMethod === 'rocket' && (
                        <button
                            onClick={startRocketPayment}
                            className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                        >
                            Pay with Rocket
                        </button>
                    )}
                    {selectedMethod === 'nagad' && (
                        <button
                            onClick={startNagadPayment}
                            className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-semibold"
                        >
                            Pay with Nagad
                        </button>
                    )}
                    <RefundProcessing paymentId={paymentSession?.paymentId} />
                    <InvoiceDisplay paymentId={paymentSession?.paymentId} />
                </div>
            ) : (
                <p>Loading order details...</p>
            )}
        </div>
    );
}
