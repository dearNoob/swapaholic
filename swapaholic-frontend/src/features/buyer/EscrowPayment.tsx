import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { paymentApi } from '../../api/payment';
import { Button } from '../../components/ui/Button';

interface EscrowPaymentProps {
    productId: string;
    productTitle: string;
    amount: number;
}

export const EscrowPayment: React.FC<EscrowPaymentProps> = ({ productId, productTitle, amount }) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('credit_card');

    const handlePayment = async () => {
        setIsLoading(true);
        try {
            // 1. Initiate Escrow
            const initResponse = await paymentApi.initiateEscrow(productId, amount);
            const paymentId = initResponse.id;

            // 2. Confirm Payment (Simulated)
            await paymentApi.process({ paymentId, details: { method: paymentMethod } });

            toast.success('Payment successful! Funds are held in escrow.');
            router.push('/dashboard');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Payment failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white shadow sm:rounded-lg overflow-hidden">
            <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Secure Escrow Payment
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                    Your funds will be held safely until you confirm delivery.
                </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Product</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{productTitle}</dd>
                    </div>
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-bold">৳{amount.toFixed(2)}</dd>
                    </div>
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Payment Method</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                            <select
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                            >
                                <option value="credit_card">Credit Card</option>
                                <option value="paypal">PayPal</option>
                                <option value="bank_transfer">Bank Transfer</option>
                            </select>
                        </dd>
                    </div>
                </dl>
            </div>
            <div className="px-4 py-5 sm:px-6">
                <Button
                    onClick={handlePayment}
                    isLoading={isLoading}
                    fullWidth
                >
                    Pay Now
                </Button>
                <p className="mt-2 text-xs text-center text-gray-500">
                    By clicking "Pay Now", you agree to our Escrow Terms of Service.
                </p>
            </div>
        </div>
    );
};
