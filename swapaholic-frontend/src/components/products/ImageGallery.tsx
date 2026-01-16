'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { FaTimes, FaChevronLeft, FaChevronRight, FaSearchPlus, FaSearchMinus, FaExpand } from 'react-icons/fa';

interface ImageGalleryProps {
    images: string[];
    alt?: string;
    className?: string;
}

export default function ImageGallery({ images, alt = 'Product image', className = '' }: ImageGalleryProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [zoom, setZoom] = useState(1);

    if (!images || images.length === 0) {
        return (
            <div className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center">
                <p className="text-gray-500">No images available</p>
            </div>
        );
    }

    const currentImage = images[selectedIndex];

    const handlePrevious = () => {
        setSelectedIndex((prev) => (prev - 1 + images.length) % images.length);
        setZoom(1);
    };

    const handleNext = () => {
        setSelectedIndex((prev) => (prev + 1) % images.length);
        setZoom(1);
    };

    const handleZoomIn = () => {
        setZoom((prev) => Math.min(prev + 0.5, 3));
    };

    const handleZoomOut = () => {
        setZoom((prev) => Math.max(prev - 0.5, 1));
    };

    const openLightbox = () => {
        setIsLightboxOpen(true);
        setZoom(1);
    };

    const closeLightbox = () => {
        setIsLightboxOpen(false);
        setZoom(1);
    };

    return (
        <>
            {/* Main Gallery */}
            <div className={`space-y-4 ${className}`}>
                {/* Main Image */}
                <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
                    <Image
                        src={currentImage}
                        alt={`${alt} ${selectedIndex + 1}`}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        priority={selectedIndex === 0}
                    />

                    {/* Expand Button */}
                    <button
                        onClick={openLightbox}
                        className="
              absolute top-4 right-4 p-3 bg-white/90 backdrop-blur-sm rounded-lg
              shadow-lg opacity-0 group-hover:opacity-100 transition-opacity
              hover:bg-white
            "
                        title="View fullscreen"
                    >
                        <FaExpand className="text-gray-700" />
                    </button>

                    {/* Navigation Arrows */}
                    {images.length > 1 && (
                        <>
                            <button
                                onClick={handlePrevious}
                                className="
                  absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 backdrop-blur-sm
                  rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity
                  hover:bg-white
                "
                            >
                                <FaChevronLeft className="text-gray-700" />
                            </button>
                            <button
                                onClick={handleNext}
                                className="
                  absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 backdrop-blur-sm
                  rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity
                  hover:bg-white
                "
                            >
                                <FaChevronRight className="text-gray-700" />
                            </button>
                        </>
                    )}

                    {/* Image Counter */}
                    {images.length > 1 && (
                        <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/60 text-white text-sm rounded-full">
                            {selectedIndex + 1} / {images.length}
                        </div>
                    )}
                </div>

                {/* Thumbnails */}
                {images.length > 1 && (
                    <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
                        {images.map((image, index) => (
                            <button
                                key={index}
                                onClick={() => setSelectedIndex(index)}
                                className={`
                  relative aspect-square rounded-lg overflow-hidden border-2 transition-all
                  ${index === selectedIndex
                                        ? 'border-indigo-600 ring-2 ring-indigo-200'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }
                `}
                            >
                                <Image
                                    src={image}
                                    alt={`${alt} thumbnail ${index + 1}`}
                                    fill
                                    className="object-cover"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Lightbox Modal */}
            {isLightboxOpen && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
                    {/* Close Button */}
                    <button
                        onClick={closeLightbox}
                        className="absolute top-4 right-4 p-3 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20 transition"
                    >
                        <FaTimes className="text-2xl" />
                    </button>

                    {/* Zoom Controls */}
                    <div className="absolute top-4 left-4 flex gap-2">
                        <button
                            onClick={handleZoomOut}
                            disabled={zoom <= 1}
                            className="p-3 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Zoom out"
                        >
                            <FaSearchMinus />
                        </button>
                        <button
                            onClick={handleZoomIn}
                            disabled={zoom >= 3}
                            className="p-3 bg-white/10 backdrop-blur-sm rounded-lg text-white hover:bg-white/20 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Zoom in"
                        >
                            <FaSearchPlus />
                        </button>
                        <div className="px-3 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-white text-sm flex items-center">
                            {Math.round(zoom * 100)}%
                        </div>
                    </div>

                    {/* Navigation */}
                    {images.length > 1 && (
                        <>
                            <button
                                onClick={handlePrevious}
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition"
                            >
                                <FaChevronLeft className="text-2xl" />
                            </button>
                            <button
                                onClick={handleNext}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-4 bg-white/10 backdrop-blur-sm rounded-full text-white hover:bg-white/20 transition"
                            >
                                <FaChevronRight className="text-2xl" />
                            </button>
                        </>
                    )}

                    {/* Image Counter */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white">
                        {selectedIndex + 1} / {images.length}
                    </div>

                    {/* Zoomed Image */}
                    <div className="relative w-full h-full flex items-center justify-center p-16 overflow-auto">
                        <div
                            style={{
                                transform: `scale(${zoom})`,
                                transition: 'transform 0.3s ease-in-out',
                            }}
                            className="relative max-w-full max-h-full"
                        >
                            <Image
                                src={currentImage}
                                alt={`${alt} ${selectedIndex + 1}`}
                                width={1200}
                                height={1200}
                                className="object-contain"
                                priority
                            />
                        </div>
                    </div>

                    {/* Keyboard Hint */}
                    <div className="absolute bottom-4 right-4 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-white text-sm">
                        <span className="opacity-70">← → to navigate | ESC to close</span>
                    </div>
                </div>
            )}
        </>
    );
}
