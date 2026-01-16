import api from './axios';

export interface Dispute {
    id: string;
    orderId: string;
    raisedBy: 'buyer' | 'seller';
    raisedByUserId: string;
    raisedByName: string;
    againstUserId: string;
    againstName: string;
    reason: string;
    description: string;
    status: 'open' | 'under_review' | 'resolved' | 'rejected';
    evidence: {
        id: string;
        type: 'image' | 'document';
        url: string;
        uploadedAt: string;
    }[];
    resolution?: {
        resolvedBy: string;
        decision: string;
        notes: string;
        resolvedAt: string;
    };
    createdAt: string;
    updatedAt: string;
}

export interface CreateDisputeData {
    orderId: string;
    reason: string;
    description: string;
    evidence?: File[];
}

export const disputeApi = {
    // Get all user's disputes
    getUserDisputes: async () => {
        const response = await api.get('/disputes');
        return response.data;
    },

    // Get dispute by ID
    getDisputeById: async (disputeId: string) => {
        const response = await api.get(`/disputes/${disputeId}`);
        return response.data;
    },

    // Create a new dispute
    create: async (data: CreateDisputeData) => {
        const formData = new FormData();
        formData.append('orderId', data.orderId);
        formData.append('reason', data.reason);
        formData.append('description', data.description);

        if (data.evidence) {
            data.evidence.forEach((file) => {
                formData.append('evidence', file);
            });
        }

        const response = await api.post('/disputes', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Add evidence to existing dispute
    addEvidence: async (disputeId: string, files: File[]) => {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append('evidence', file);
        });

        const response = await api.post(`/disputes/${disputeId}/evidence`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    // Admin: Resolve dispute
    resolve: async (disputeId: string, decision: string, notes: string) => {
        const response = await api.put(`/disputes/${disputeId}/resolve`, {
            decision,
            notes,
        });
        return response.data;
    },

    // Update dispute status
    updateStatus: async (disputeId: string, status: string) => {
        const response = await api.put(`/disputes/${disputeId}/status`, { status });
        return response.data;
    },
};
