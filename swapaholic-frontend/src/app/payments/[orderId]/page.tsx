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

    const handlePaymentRedirect = async (method: 'stripe' | 'paypal' | 'bkash' | 'rocket' | 'nagad') => {
        if (!orderDetails) return;
        try {
            const payment = await paymentApi.initiate({
                orderId: orderDetails.id,
                method
            });
            setPaymentSession(payment);

            const session = payment as any;

            // Check for Mock Gateway URL (or standard paymentUrl)
            if (session.gatewayUrl) {
                window.location.href = session.gatewayUrl;
                return;
            }

            // Fallback for legacy implementations (if any)
            if (session.paymentUrl) {
                window.location.href = session.paymentUrl;
            }
        } catch (error) {
            console.error(`${method} payment error:`, error);
        }
    };

    const startStripePayment = () => handlePaymentRedirect('stripe'); // Now redirected to Mock Gateway if 'card' or 'stripe' logic matches
    const startPayPalPayment = () => handlePaymentRedirect('paypal'); // PayPal can also go to Mock Gateway if we want
    const startBkashPayment = () => handlePaymentRedirect('bkash');
    const startRocketPayment = () => handlePaymentRedirect('rocket');
    const startNagadPayment = () => handlePaymentRedirect('nagad');

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
                    {/* Update button logic if needed, but since we updated the function names/definitions above, the existing JSX calls to startBkashPayment etc should work fine. */}
                    {selectedMethod === 'stripe' && (
                        // We will allow the user to click "Pay with Card" which redirects to Gateway for "card"
                        <button
                            onClick={() => handlePaymentRedirect('card' as any)}
                            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex justify-center items-center gap-2"
                        >
                            Pay with Secure Gateway
                        </button>
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
                    <RefundProcessing paymentId={paymentSession?.id} />
                    <InvoiceDisplay paymentId={paymentSession?.id} />
                </div>
            ) : (
                <p>Loading order details...</p>
            )}
        </div>
    );
}
