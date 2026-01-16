'use client';

import { useState } from 'react';
import Image from 'next/image';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface ImageCarouselProps {
    images: string[];
    productTitle: string;
}

export default function ImageCarousel({ images, productTitle }: ImageCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    const goToPrevious = () => {
        setCurrentIndex((prevIndex) => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
    };

    const goToNext = () => {
        setCurrentIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
    };

    const goToImage = (index: number) => {
        setCurrentIndex(index);
    };

    if (!images || images.length === 0) {
        return (
            <div className="flex items-center justify-center h-96 bg-gray-200 rounded-lg">
                <p className="text-gray-500">No images available</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Main Image Display */}
            <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
                <Image
                    src={images[currentIndex]}
                    alt={`${productTitle} - Image ${currentIndex + 1}`}
                    fill
                    className="object-cover"
                    priority={currentIndex === 0}
                />

                {/* Navigation Arrows */}
                {images.length > 1 && (
                    <>
                        <button
                            onClick={goToPrevious}
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            aria-label="Previous image"
                        >
                            <FaChevronLeft className="text-xl" />
                        </button>
                        <button
                            onClick={goToNext}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            aria-label="Next image"
                        >
                            <FaChevronRight className="text-xl" />
                        </button>
                    </>
                )}

                {/* Image Counter */}
                <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                    {currentIndex + 1} / {images.length}
                </div>
            </div>

            {/* Thumbnail Navigation */}
            {images.length > 1 && (
                <div className="grid grid-cols-5 gap-2">
                    {images.map((image, index) => (
                        <button
                            key={index}
                            onClick={() => goToImage(index)}
                            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${index === currentIndex
                                    ? 'border-indigo-600 ring-2 ring-indigo-200'
                                    : 'border-gray-200 hover:border-gray-400'
                                }`}
                        >
                            <Image
                                src={image}
                                alt={`${productTitle} thumbnail ${index + 1}`}
                                fill
                                className="object-cover"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
