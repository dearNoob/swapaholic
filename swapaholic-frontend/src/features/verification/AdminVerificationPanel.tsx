'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { toast } from 'react-toastify';
import { 
    FaCheck, 
    FaTimes, 
    FaRobot, 
    FaBoxOpen, 
    FaExclamationTriangle,
    FaSearchPlus,
    FaRegLightbulb
} from 'react-icons/fa';
import { Button } from '../../components/ui/Button';

interface Product {
    _id: string;
    title: string;
    description: string;
    category: string;
    basePrice: number;
    condition: string;
    images: string[];
    aiQualityScore: number;
    createdAt: string;
    sellerId?: {
        firstName: string;
        lastName: string;
        email: string;
        ratingAverage?: number;
    };
}

export const AdminVerificationPanel = () => {
    const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    const fetchPending = async () => {
        try {
            setLoading(true);
            const response = await adminApi.getPendingProducts({ limit: 50 });
            
            // Backend returns { success: true, data: { data: [...] } }
            let list = [];
            if (Array.isArray(response)) list = response;
            else if (Array.isArray(response?.data?.data)) list = response.data.data;
            else if (Array.isArray(response?.data)) list = response.data;
            else if (Array.isArray(response?.products)) list = response.products;
            
            setPendingProducts(list);
            
            // Auto-select first item if exists and nothing is selected
            if (list.length > 0 && !selectedProduct) {
                setSelectedProduct(list[0]);
            }
        } catch (err) {
            console.error('Failed to fetch pending products', err);
            toast.error('Failed to load pending products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPending();
    }, []);

    const handleSelectProduct = (product: Product) => {
        setSelectedProduct(product);
        setActiveImageIndex(0);
        setIsRejecting(false);
        setRejectReason('');
    };

    const handleApprove = async (id: string) => {
        try {
            await adminApi.approveProduct(id);
            toast.success('Product Listing Approved');
            
            // Remove from list
            const updated = pendingProducts.filter(p => p._id !== id);
            setPendingProducts(updated);
            
            // Select next item
            setSelectedProduct(updated.length > 0 ? updated[0] : null);
        } catch (err) {
            console.error(err);
            toast.error('Approval failed');
        }
    };

    const handleReject = async (id: string) => {
        if (!rejectReason) {
            toast.warning('Please select or type a rejection reason');
            return;
        }

        try {
            await adminApi.rejectProduct(id, rejectReason);
            toast.success('Product Listing Rejected');
            
            // Remove from list
            const updated = pendingProducts.filter(p => p._id !== id);
            setPendingProducts(updated);
            
            // Select next item
            setSelectedProduct(updated.length > 0 ? updated[0] : null);
            setIsRejecting(false);
            setRejectReason('');
        } catch (err) {
            console.error(err);
            toast.error('Rejection failed');
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Loading Queue...</p>
                </div>
            </div>
        );
    }

    if (pendingProducts.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
                <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FaCheck className="text-3xl text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Queue is Empty</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                    Great job! There are currently no new products waiting for Quality Control manual verification.
                </p>
                <Button 
                    variant="outline" 
                    className="mt-6"
                    onClick={fetchPending}
                >
                    Refresh Queue
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-[120px])] min-h-[600px]">
            {/* Left Sidebar: Queue List */}
            <div className="w-full lg:w-1/3 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-slate-50 flex justify-between items-center">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2">
                        <FaBoxOpen className="text-indigo-600" />
                        Pending Items
                    </h2>
                    <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2.5 py-1 rounded-full">
                        {pendingProducts.length}
                    </span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    {pendingProducts.map((product) => (
                        <button
                            key={product._id}
                            onClick={() => handleSelectProduct(product)}
                            className={`w-full text-left p-3 mb-2 rounded-xl transition-all border ${
                                selectedProduct?._id === product._id 
                                ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                                : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-200'
                            }`}
                        >
                            <div className="flex gap-3">
                                <div className="w-12 h-12 rounded bg-gray-100 shrink-0 overflow-hidden">
                                    {product.images?.[0] ? (
                                        <img src={`http://localhost:5000${product.images[0]}`} alt={product.title} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <FaBoxOpen />
                                        </div>
                                    )}
                                </div>
                                <div className="overflow-hidden">
                                    <h4 className="font-semibold text-gray-900 text-sm truncate">{product.title}</h4>
                                    <p className="text-xs text-gray-500 mt-0.5 truncate">{product.category} • ৳{product.basePrice}</p>
                                    
                                    <div className="flex items-center gap-2 mt-1.5">
                                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded border ${getScoreColor(product.aiQualityScore || 0)}`}>
                                            <FaRobot /> AI: {product.aiQualityScore || 0}
                                        </span>
                                        <span className="text-[10px] text-gray-400">
                                            {new Date(product.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Pane: Main Verification Interface */}
            <div className="w-full lg:w-2/3 flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {selectedProduct ? (
                    <div className="flex flex-col h-full">
                        
                        {/* Upper Half: Image Gallery & AI Data */}
                        <div className="flex flex-col md:flex-row h-1/2 border-b border-gray-100">
                            
                            {/* Image Viewer */}
                            <div className="w-full md:w-3/5 bg-gray-900 relative group">
                                {selectedProduct.images?.[activeImageIndex] ? (
                                    <img 
                                        src={`http://localhost:5000${selectedProduct.images[activeImageIndex]}`} 
                                        alt={selectedProduct.title} 
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 text-sm">
                                        <FaBoxOpen className="text-4xl mb-2 opacity-50" />
                                        No Images Provided
                                    </div>
                                )}
                                
                                {/* Image Navigation Overlays */}
                                {selectedProduct.images?.length > 1 && (
                                    <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 z-10">
                                        {selectedProduct.images.map((img, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => setActiveImageIndex(idx)}
                                                className={`w-12 h-12 rounded border-2 overflow-hidden transition ${activeImageIndex === idx ? 'border-primary' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                            >
                                                <img src={`http://localhost:5000${img}`} className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                                
                                {/* Zoom Hint */}
                                <div className="absolute top-4 right-4 bg-black/50 backdrop-blur text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                                    <FaSearchPlus /> Hover to Zoom (Coming Soon)
                                </div>
                            </div>

                            {/* AI Assessment Panel */}
                            <div className="w-full md:w-2/5 p-6 bg-slate-50 flex flex-col">
                                <h3 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <FaRobot className="text-lg" /> AI Assessment
                                </h3>
                                
                                {/* Score Circle */}
                                <div className="flex items-center gap-4 mb-6">
                                    <div className={`w-16 h-16 rounded-full flex flex-col items-center justify-center border-4 ${selectedProduct.aiQualityScore >= 80 ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : selectedProduct.aiQualityScore >= 50 ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-red-500 bg-red-50 text-red-700'}`}>
                                        <span className="text-xl font-black">{selectedProduct.aiQualityScore || 0}</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900">Quality Score</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Based on image analysis & metadata</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                                        <p className="text-xs font-bold text-gray-500 mb-1">Detected Confidence</p>
                                        <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                                            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${selectedProduct.aiQualityScore || 0}%` }}></div>
                                        </div>
                                    </div>

                                    {selectedProduct.aiQualityScore < 50 && (
                                        <div className="bg-red-50 p-3 rounded-lg border border-red-200 flex items-start gap-2 text-sm text-red-800">
                                            <FaExclamationTriangle className="mt-0.5 shrink-0" />
                                            <p>AI Flag: Low quality score. Review images carefully for damage or counterfeits.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Lower Half: Product Details & Actions */}
                        <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
                            
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-900">{selectedProduct.title}</h1>
                                        <div className="flex gap-3 text-sm text-gray-500 mt-1">
                                            <span className="uppercase tracking-wide font-medium">{selectedProduct.category}</span>
                                            <span>•</span>
                                            <span className="capitalize">{selectedProduct.condition.replace('_', ' ')}</span>
                                            <span>•</span>
                                            <span className="text-indigo-600 font-bold">৳{selectedProduct.basePrice.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6 text-sm text-gray-700 whitespace-pre-wrap">
                                    {selectedProduct.description}
                                </div>
                            </div>

                            {/* Decision Actions */}
                            <div className="pt-4 border-t border-gray-100 mt-auto">
                                {!isRejecting ? (
                                    <div className="flex justify-end gap-3">
                                        <Button 
                                            variant="danger" 
                                            onClick={() => setIsRejecting(true)}
                                            className="px-6"
                                        >
                                            <FaTimes className="mr-2" /> Reject Listing
                                        </Button>
                                        <Button 
                                            variant="primary" 
                                            onClick={() => handleApprove(selectedProduct._id)}
                                            className="px-8"
                                        >
                                            <FaCheck className="mr-2" /> Approve Listing
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="bg-red-50 border border-red-200 p-4 rounded-xl animate-fade-in">
                                        <h4 className="font-bold text-red-800 mb-3 text-sm">Select Rejection Reason</h4>
                                        <div className="grid grid-cols-2 gap-2 mb-4">
                                            {['Counterfeit Item', 'Poor Image Quality', 'Inappropriate Content', 'Price Unrealistic', 'Insufficient Details', 'Other'].map(reason => (
                                                <button
                                                    key={reason}
                                                    onClick={() => setRejectReason(reason)}
                                                    className={`p-2 text-sm text-center rounded border transition ${rejectReason === reason ? 'bg-red-600 text-white border-red-600' : 'bg-white text-gray-700 border-gray-200 hover:border-red-300'}`}
                                                >
                                                    {reason}
                                                </button>
                                            ))}
                                        </div>
                                        
                                        {rejectReason === 'Other' && (
                                            <input 
                                                type="text" 
                                                placeholder="Type custom reason..." 
                                                className="w-full p-2 mb-4 rounded border border-gray-300 text-sm focus:ring-2 focus:ring-red-500"
                                                onChange={(e) => setRejectReason(e.target.value)}
                                            />
                                        )}

                                        <div className="flex justify-end gap-2">
                                            <Button variant="outline" size="sm" onClick={() => setIsRejecting(false)}>
                                                Cancel
                                            </Button>
                                            <Button variant="danger" size="sm" onClick={() => handleReject(selectedProduct._id)}>
                                                Confirm Rejection
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                        <p>Select a product to view details</p>
                    </div>
                )}
            </div>
        </div>
    );
};
