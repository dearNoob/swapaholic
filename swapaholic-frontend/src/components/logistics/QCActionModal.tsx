'use client';

import { useState } from 'react';
import {
    FaPlay, FaClipboardCheck, FaCheckCircle, FaTimesCircle, FaSpinner,
    FaTimes, FaStar, FaExclamationTriangle
} from 'react-icons/fa';
import { logisticsApi } from '../../api/logistics';
import { toast } from 'react-toastify';

interface QCTask {
    _id: string;
    status: string;
    orderId?: { _id: string };
    product?: { title: string };
    seller?: { firstName: string; lastName: string };
    inspectionNotes?: string;
}

interface QCActionModalProps {
    task: QCTask;
    onClose: () => void;
    onSuccess: () => void;
}

export const QCActionModal = ({ task, onClose, onSuccess }: QCActionModalProps) => {
    const [activeAction, setActiveAction] = useState<'review' | 'approve' | 'reject' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [qualityScore, setQualityScore] = useState(90);
    const [notes, setNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [step, setStep] = useState<'pick' | 'form'>('pick');

    const handleReview = async () => {
        setIsSubmitting(true);
        try {
            await logisticsApi.reviewQC(task._id);
            toast.success('QC review started');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to start review');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleApprove = async () => {
        setIsSubmitting(true);
        try {
            await logisticsApi.approveQC(task._id, { qualityValidation: qualityScore, notes });
            toast.success('✅ QC Approved! Buyer will be notified.');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to approve QC');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            toast.error('Please provide a rejection reason');
            return;
        }
        setIsSubmitting(true);
        try {
            await logisticsApi.rejectQC(task._id, { rejectionReason, notes });
            toast.success('QC Rejected. Seller will be notified.');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to reject QC');
        } finally {
            setIsSubmitting(false);
        }
    };

    const productTitle = task.product?.title || 'this item';
    const sellerName = task.seller ? `${task.seller.firstName} ${task.seller.lastName}` : 'Seller';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-slate-800 rounded-2xl border border-slate-700 max-w-lg w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-slate-700">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <FaClipboardCheck className="text-teal-400" />
                            QC Inspection
                        </h3>
                        <p className="text-sm text-gray-400 mt-0.5">
                            {productTitle} — {sellerName}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700">
                        <FaTimes />
                    </button>
                </div>

                {/* QC Status badge */}
                <div className="px-5 pt-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                        task.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                        task.status === 'in_review' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                        'bg-gray-500/20 text-gray-400 border-gray-500/30'
                    }`}>
                        Current status: {task.status?.replace('_', ' ')}
                    </span>

                    {task.inspectionNotes && (
                        <div className="mt-3 p-3 bg-slate-700/50 rounded-xl text-sm text-gray-300">
                            <p className="font-medium text-gray-400 text-xs mb-1">Inspection Notes:</p>
                            {task.inspectionNotes}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-5">
                    {step === 'pick' ? (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-400 mb-4">Choose an action for this QC inspection:</p>

                            {/* Start Review */}
                            {task.status === 'pending' && (
                                <button
                                    onClick={handleReview}
                                    disabled={isSubmitting}
                                    className="w-full flex items-center gap-3 p-4 bg-blue-600/10 border border-blue-500/30 rounded-xl hover:bg-blue-600/20 transition-all text-left group disabled:opacity-50"
                                >
                                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                                        {isSubmitting ? <FaSpinner className="text-blue-400 animate-spin" /> : <FaPlay className="text-blue-400 text-sm" />}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white text-sm">Start Review</p>
                                        <p className="text-xs text-gray-400">Begin physical inspection of the item</p>
                                    </div>
                                </button>
                            )}

                            {/* Approve QC */}
                            {['pending', 'in_review'].includes(task.status) && (
                                <button
                                    onClick={() => { setActiveAction('approve'); setStep('form'); }}
                                    className="w-full flex items-center gap-3 p-4 bg-emerald-600/10 border border-emerald-500/30 rounded-xl hover:bg-emerald-600/20 transition-all text-left group"
                                >
                                    <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center group-hover:bg-emerald-500/30 transition-colors">
                                        <FaCheckCircle className="text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white text-sm">Approve QC</p>
                                        <p className="text-xs text-gray-400">Item passed — delivery will be triggered</p>
                                    </div>
                                </button>
                            )}

                            {/* Reject QC */}
                            {['pending', 'in_review'].includes(task.status) && (
                                <button
                                    onClick={() => { setActiveAction('reject'); setStep('form'); }}
                                    className="w-full flex items-center gap-3 p-4 bg-red-600/10 border border-red-500/30 rounded-xl hover:bg-red-600/20 transition-all text-left group"
                                >
                                    <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                                        <FaTimesCircle className="text-red-400" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white text-sm">Reject QC</p>
                                        <p className="text-xs text-gray-400">Item failed — seller will be notified</p>
                                    </div>
                                </button>
                            )}
                        </div>
                    ) : (
                        /* Form step — Approve or Reject details */
                        <div className="space-y-4">
                            <button onClick={() => setStep('pick')} className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1 transition-colors">
                                ← Back
                            </button>

                            {activeAction === 'approve' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Quality Score: <span className="text-emerald-400 font-bold">{qualityScore}%</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="50"
                                            max="100"
                                            value={qualityScore}
                                            onChange={e => setQualityScore(Number(e.target.value))}
                                            className="w-full accent-teal-500"
                                        />
                                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                                            <span>50 — Acceptable</span>
                                            <span>100 — Perfect</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Notes (optional)</label>
                                        <textarea
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            placeholder="Any inspection remarks..."
                                            rows={3}
                                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                                        />
                                    </div>
                                    <button
                                        onClick={handleApprove}
                                        disabled={isSubmitting}
                                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-green-700 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <><FaSpinner className="animate-spin" /> Approving...</> : <><FaCheckCircle /> Approve QC</>}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                                        <FaExclamationTriangle className="text-red-400 mt-0.5 flex-shrink-0" />
                                        <p className="text-sm text-red-300">Rejecting will block payment release and notify the seller.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Rejection Reason <span className="text-red-400">*</span></label>
                                        <textarea
                                            value={rejectionReason}
                                            onChange={e => setRejectionReason(e.target.value)}
                                            placeholder="Describe why the item failed QC..."
                                            rows={3}
                                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Additional Notes (optional)</label>
                                        <textarea
                                            value={notes}
                                            onChange={e => setNotes(e.target.value)}
                                            placeholder="Any additional remarks..."
                                            rows={2}
                                            className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                                        />
                                    </div>
                                    <button
                                        onClick={handleReject}
                                        disabled={isSubmitting || !rejectionReason.trim()}
                                        className="w-full py-3 bg-gradient-to-r from-red-600 to-red-700 text-white font-semibold rounded-xl hover:from-red-700 hover:to-red-800 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <><FaSpinner className="animate-spin" /> Rejecting...</> : <><FaTimesCircle /> Reject QC</>}
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
