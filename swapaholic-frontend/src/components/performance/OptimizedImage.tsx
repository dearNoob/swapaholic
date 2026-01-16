'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
    src: string;
    alt: string;
    width?: number;
    height?: number;
    priority?: boolean;
    className?: string;
    objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

/**
 * Optimized image component with:
 * - Automatic WebP/AVIF conversion
 * - Lazy loading (except priority images)
 * - Responsive sizes
 * - Blur placeholder
 * - Loading state
 */
export default function OptimizedImage({
    src,
    alt,
    width,
    height,
    priority = false,
    className = '',
    objectFit = 'cover'
}: OptimizedImageProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    // Generate responsive srcset based on common breakpoints
    const sizes = priority
        ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
        : '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

    return (
        <div className={`relative ${className}`} style={{ width, height }}>
            {isLoading && !error && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}

            {error ? (
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-gray-400">
                    <span>Failed to load</span>
                </div>
            ) : (
                <Image
                    src={src}
                    alt={alt}
                    width={width}
                    height={height}
                    fill={!width && !height}
                    priority={priority}
                    loading={priority ? 'eager' : 'lazy'}
                    sizes={sizes}
                    quality={85}
                    className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
                    style={{ objectFit }}
                    onLoadingComplete={() => setIsLoading(false)}
                    onError={() => {
                        setError(true);
                        setIsLoading(false);
                    }}
                    // Enable Next.js automatic image optimization
                    placeholder="blur"
                    blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4="
                />
            )}
        </div>
    );
}

// Utility to prefetch images on hover
export function usePrefetchImage(src: string) {
    const prefetch = () => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.as = 'image';
        link.href = src;
        document.head.appendChild(link);
    };

    return { onMouseEnter: prefetch };
}
