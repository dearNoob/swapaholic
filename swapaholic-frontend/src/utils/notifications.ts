import { toast } from 'react-toastify';

export const notificationHelper = {
    success: (message: string) => {
        toast.success(message, {
            position: 'top-right',
            autoClose: 3000,
        });
    },

    error: (message: string) => {
        toast.error(message, {
            position: 'top-right',
            autoClose: 5000,
        });
    },

    info: (message: string) => {
        toast.info(message, {
            position: 'top-right',
            autoClose: 4000,
        });
    },

    warning: (message: string) => {
        toast.warning(message, {
            position: 'top-right',
            autoClose: 4000,
        });
    },

    // Specific notification types
    bidPlaced: (amount: number, productTitle: string) => {
        toast.info(`New bid of $৳{amount} placed on ${productTitle}`, {
            position: 'top-right',
            autoClose: 5000,
        });
    },

    bidWon: (productTitle: string) => {
        toast.success(`🎉 Congratulations! You won the auction for ${productTitle}`, {
            position: 'top-right',
            autoClose: 8000,
        });
    },

    paymentConfirmed: (amount: number) => {
        toast.success(`Payment of $৳{amount} confirmed successfully`, {
            position: 'top-right',
            autoClose: 5000,
        });
    },

    deliveryUpdated: (status: string, productTitle: string) => {
        toast.info(`Delivery status updated: ${status} for ${productTitle}`, {
            position: 'top-right',
            autoClose: 5000,
        });
    },

    disputeUpdate: (status: string) => {
        toast.info(`Your dispute status has been updated: ${status}`, {
            position: 'top-right',
            autoClose: 6000,
        });
    },

    verificationComplete: (status: 'approved' | 'rejected', productTitle: string) => {
        if (status === 'approved') {
            toast.success(`✅ Your product "${productTitle}" has been verified and is now live!`, {
                position: 'top-right',
                autoClose: 6000,
            });
        } else {
            toast.error(`❌ Your product "${productTitle}" was rejected. Please review feedback.`, {
                position: 'top-right',
                autoClose: 8000,
            });
        }
    },
};
