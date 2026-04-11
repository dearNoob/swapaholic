'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { paymentsApi } from '@/api/payments';
import { ordersApi } from '@/api/orders';
import PaymentMethodSelector from '@/components/payments/PaymentMethodSelector';
import StripeCheckoutButton from '@/components/payments/StripeCheckoutButton';
import InvoiceDisplay from '@/components/payments/InvoiceDisplay';
import { Order, Payment } from '@/types/api';

type SelectedMethod = 'stripe' | 'paypal' | 'escrow' | 'bkash' | 'rocket' | 'nagad' | null;

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === 'object' && 'message' in error && typeof (error as { message: string }).message === 'string') {
        return (error as { message: string }).message;
    }
    return fallback;
};

const formatPaymentStatus = (status: Payment['status']) => {
    switch (status) {
        case 'pending':
            return 'Pending payment';
        case 'escrowed':
            return 'Payment secured in escrow';
        case 'released':
            return 'Payment released';
        case 'refunded':
            return 'Payment refunded';
        case 'failed':
            return 'Payment failed';
        default:
            return status;
    }
};

export default function PaymentPage() {
    const params = useParams();
    const orderId = String(params.orderId ?? '');
    const [orderDetails, setOrderDetails] = useState<Order | null>(null);
    const [selectedMethod, setSelectedMethod] = useState<SelectedMethod>(null);
    const [paymentSession, setPaymentSession] = useState<Payment | null>(null);
    const [isLoadingOrder, setIsLoadingOrder] = useState(true);
    const [isLoadingPayment, setIsLoadingPayment] = useState(true);

    const loadOrderDetails = useCallback(async () => {
        if (!orderId) {
            setIsLoadingOrder(false);
            return;
        }

        try {
            setIsLoadingOrder(true);
            const order = await ordersApi.getOrderById(orderId);
            setOrderDetails(order);
        } catch (error) {
            console.error('Error fetching order:', error);
            toast.error(getErrorMessage(error, 'Failed to load order details'));
        } finally {
            setIsLoadingOrder(false);
        }
    }, [orderId]);

    const loadExistingPayment = useCallback(async () => {
        if (!orderId) {
            setIsLoadingPayment(false);
            return;
        }

        try {
            setIsLoadingPayment(true);
            const payment = await paymentsApi.getPayment(orderId);
            setPaymentSession(payment);
        } catch (error) {
            const status = error && typeof error === 'object' && 'status' in error ? (error as { status?: number }).status : undefined;
            if (status !== 404) {
                console.error('Error fetching payment:', error);
                toast.error(getErrorMessage(error, 'Failed to load payment details'));
            }
            setPaymentSession(null);
        } finally {
            setIsLoadingPayment(false);
        }
    }, [orderId]);

    useEffect(() => {
        void loadOrderDetails();
        void loadExistingPayment();
    }, [loadExistingPayment, loadOrderDetails]);

    const handlePaymentRedirect = async (method: 'bkash' | 'rocket' | 'nagad') => {
        if (!orderDetails) return;

        try {
            const payment = await paymentsApi.initiate({
                orderId: orderDetails.id,
                method
            });

            setPaymentSession(payment);

            if (payment.gatewayUrl) {
                window.location.href = payment.gatewayUrl;
                return;
            }

            toast.error('Payment gateway URL was not returned for this method.');
        } catch (error) {
            console.error(`${method} payment error:`, error);
            toast.error(getErrorMessage(error, `Failed to start ${method} payment`));
        }
    };

    const handleStripeSuccess = async (payment?: Payment) => {
        if (payment) {
            setPaymentSession(payment);
        }
        await loadExistingPayment();
        toast.success('Payment completed successfully.');
    };

    const isBusy = isLoadingOrder || isLoadingPayment;
    const hasCompletedPayment = paymentSession?.status === 'escrowed' || paymentSession?.status === 'released';

    return (
        <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold mb-4">Payment for Order #{orderId}</h1>

            {isBusy && <p>Loading payment details...</p>}

            {!isBusy && !orderDetails && (
                <p className="text-red-600">We couldn&apos;t load this order.</p>
            )}

            {orderDetails && (
                <div className="space-y-4">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="text-sm text-gray-600">Order Summary</p>
                        <p className="font-semibold text-gray-900">Order #{orderDetails.id}</p>
                        <p className="text-xl font-semibold mt-2">Amount: {orderDetails.totalAmount} BDT</p>
                        <p className="text-sm text-gray-500 mt-1">Status: {orderDetails.status}</p>
                    </div>

                    {paymentSession && (
                        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4">
                            <p className="text-sm text-indigo-700">Current Payment</p>
                            <p className="font-semibold text-indigo-950">{formatPaymentStatus(paymentSession.status)}</p>
                            {paymentSession.transactionId && (
                                <p className="text-sm text-indigo-800 mt-1">Transaction ID: {paymentSession.transactionId}</p>
                            )}
                        </div>
                    )}

                    {!hasCompletedPayment && (
                        <>
                            <PaymentMethodSelector onSelect={setSelectedMethod} selected={selectedMethod} />

                            {selectedMethod === 'stripe' && (
                                <StripeCheckoutButton
                                    orderId={orderDetails.id}
                                    amount={orderDetails.totalAmount}
                                    onSuccess={handleStripeSuccess}
                                />
                            )}

                            {selectedMethod === 'paypal' && (
                                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
                                    PayPal checkout is not wired up yet in this codebase. Please use card or a mobile wallet instead.
                                </div>
                            )}

                            {selectedMethod === 'escrow' && (
                                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                                    Escrow is applied automatically once your payment succeeds. You don&apos;t need a separate escrow action here.
                                </div>
                            )}

                            {selectedMethod === 'bkash' && (
                                <button
                                    onClick={() => void handlePaymentRedirect('bkash')}
                                    className="w-full px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition font-semibold"
                                >
                                    Pay with bKash
                                </button>
                            )}

                            {selectedMethod === 'rocket' && (
                                <button
                                    onClick={() => void handlePaymentRedirect('rocket')}
                                    className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold"
                                >
                                    Pay with Rocket
                                </button>
                            )}

                            {selectedMethod === 'nagad' && (
                                <button
                                    onClick={() => void handlePaymentRedirect('nagad')}
                                    className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-semibold"
                                >
                                    Pay with Nagad
                                </button>
                            )}
                        </>
                    )}

                    {paymentSession && <InvoiceDisplay paymentId={paymentSession.id} />}
                </div>
            )}
        </div>
    );
}
