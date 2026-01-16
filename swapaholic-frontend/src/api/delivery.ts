import api from './axios';

export const deliveryApi = {
    getActiveDeliveries: async () => {
        const response = await api.get('/delivery/active');
        return response.data;
    },

    getDeliveryById: async (orderId: string) => {
        const response = await api.get(`/delivery/${orderId}`);
        return response.data;
    },

    confirmDelivery: async (orderId: string, proof?: File) => {
        const formData = new FormData();
        if (proof) {
            formData.append('proof', proof);
        }
        const response = await api.post(`/delivery/${orderId}/confirm`, formData);
        return response.data;
    },

    updateDeliveryStatus: async (orderId: string, status: string, location?: { lat: number; lng: number }) => {
        const response = await api.put(`/delivery/${orderId}/status`, { status, location });
        return response.data;
    },
};
