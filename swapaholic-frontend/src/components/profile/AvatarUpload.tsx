'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { FaCamera, FaTimes, FaCheck, FaUndo } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface AvatarUploadProps {
    currentAvatar?: string;
    onUpload?: (file: File, croppedDataUrl: string) => void;
    size?: 'sm' | 'md' | 'lg';
}

export default function AvatarUpload({
    currentAvatar,
    onUpload,
    size = 'md'
}: AvatarUploadProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [originalImage, setOriginalImage] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [zoom, setZoom] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imageRef = useRef<HTMLImageElement>(null);

    const sizeClasses = {
        sm: 'w-20 h-20',
        md: 'w-32 h-32',
        lg: 'w-40 h-40'
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            setOriginalImage(dataUrl);
            setPreview(dataUrl);
            setIsEditing(true);
            setZoom(1);
            setPosition({ x: 0, y: 0 });
        };
        reader.readAsDataURL(file);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragStart.x,
            y: e.clientY - dragStart.y
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const getCroppedImage = (): string | null => {
        if (!imageRef.current || !canvasRef.current) return null;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const size = 300; // Output size
        canvas.width = size;
        canvas.height = size;

        const img = imageRef.current;
        const scale = zoom;

        // Draw circular clipped image
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        const drawWidth = img.width * scale;
        const drawHeight = img.height * scale;
        const drawX = (size - drawWidth) / 2 + position.x;
        const drawY = (size - drawHeight) / 2 + position.y;

        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
        ctx.restore();

        return canvas.toDataURL('image/png');
    };

    const handleSave = () => {
        const croppedDataUrl = getCroppedImage();
        if (!croppedDataUrl) {
            toast.error('Failed to process image');
            return;
        }

        // Convert data URL to File
        fetch(croppedDataUrl)
            .then(res => res.blob())
            .then(blob => {
                const file = new File([blob], 'avatar.png', { type: 'image/png' });
                onUpload?.(file, croppedDataUrl);
                setPreview(croppedDataUrl);
                setIsEditing(false);
                toast.success('Avatar updated!');
            });
    };

    const handleCancel = () => {
        setIsEditing(false);
        setPreview(null);
        setOriginalImage(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleReset = () => {
        setZoom(1);
        setPosition({ x: 0, y: 0 });
    };

    return (
        <div className="space-y-4">
            {/* Avatar Display/Upload */}
            <div className="flex items-center gap-6">
                <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden bg-gray-200 group`}>
                    {preview || currentAvatar ? (
                        <Image
                            src={preview || currentAvatar || ''}
                            alt="Avatar"
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <FaCamera className="text-3xl" />
                        </div>
                    )}

                    {!isEditing && (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="
                absolute inset-0 bg-black/50 flex items-center justify-center
                opacity-0 group-hover:opacity-100 transition-opacity
              "
                        >
                            <FaCamera className="text-white text-2xl" />
                        </button>
                    )}
                </div>

                <div>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                        {currentAvatar || preview ? 'Change Avatar' : 'Upload Avatar'}
                    </button>
                    <p className="text-sm text-gray-500 mt-2">
                        JPG, PNG or GIF. Max 5MB.
                    </p>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                />
            </div>

            {/* Editor Modal */}
            {isEditing && originalImage && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
                        {/* Header */}
                        <div className="border-b p-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold">Adjust Your Avatar</h3>
                            <button
                                onClick={handleCancel}
                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {/* Editor */}
                        <div className="p-6 space-y-6">
                            {/* Canvas Preview */}
                            <div className="flex justify-center">
                                <div
                                    className="relative w-80 h-80 rounded-full overflow-hidden bg-gray-100 border-4 border-gray-300 cursor-move"
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                >
                                    <img
                                        ref={imageRef}
                                        src={originalImage}
                                        alt="Preview"
                                        className="absolute pointer-events-none select-none"
                                        style={{
                                            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                                            transformOrigin: 'center',
                                            left: '50%',
                                            top: '50%',
                                            marginLeft: '-50%',
                                            marginTop: '-50%',
                                            maxWidth: 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Zoom Control */}
                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    Zoom: {Math.round(zoom * 100)}%
                                </label>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="3"
                                    step="0.1"
                                    value={zoom}
                                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                                    className="w-full"
                                />
                            </div>

                            <p className="text-sm text-gray-600 text-center">
                                Drag to reposition • Use slider to zoom
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="border-t p-4 flex gap-3 justify-between">
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
                            >
                                <FaUndo />
                                Reset
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleCancel}
                                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                                >
                                    <FaCheck />
                                    Save Avatar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden canvas for cropping */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
}
