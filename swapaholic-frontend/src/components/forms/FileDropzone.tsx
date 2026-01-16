'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FaCloudUploadAlt, FaTimes, FaImage, FaFilePdf, FaFile } from 'react-icons/fa';
import Image from 'next/image';

interface FileWithPreview extends File {
    preview?: string;
}

interface FileDropzoneProps {
    maxFiles?: number;
    maxSize?: number; // in bytes
    accept?: Record<string, string[]>;
    onFilesChange?: (files: File[]) => void;
    existingFiles?: string[];
    className?: string;
}

export default function FileDropzone({
    maxFiles = 5,
    maxSize = 5 * 1024 * 1024, // 5MB default
    accept = {
        'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    },
    onFilesChange,
    existingFiles = [],
    className = ''
}: FileDropzoneProps) {
    const [files, setFiles] = useState<FileWithPreview[]>([]);
    const [error, setError] = useState<string>('');

    const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
        setError('');

        if (rejectedFiles.length > 0) {
            const rejection = rejectedFiles[0];
            if (rejection.errors[0]?.code === 'file-too-large') {
                setError(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
            } else if (rejection.errors[0]?.code === 'file-invalid-type') {
                setError('Invalid file type. Please upload images only.');
            } else {
                setError('File upload failed. Please try again.');
            }
            return;
        }

        if (files.length + acceptedFiles.length + existingFiles.length > maxFiles) {
            setError(`Maximum ${maxFiles} files allowed`);
            return;
        }

        const newFiles = acceptedFiles.map(file =>
            Object.assign(file, {
                preview: URL.createObjectURL(file)
            })
        );

        const updatedFiles = [...files, ...newFiles];
        setFiles(updatedFiles);
        onFilesChange?.(updatedFiles);
    }, [files, maxFiles, maxSize, existingFiles.length, onFilesChange]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
        maxFiles,
        maxSize,
        multiple: maxFiles > 1
    });

    const removeFile = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        setFiles(newFiles);
        onFilesChange?.(newFiles);
        setError('');
    };

    const getFileIcon = (file: FileWithPreview) => {
        if (file.type.startsWith('image/')) return FaImage;
        if (file.type === 'application/pdf') return FaFilePdf;
        return FaFile;
    };

    const totalFiles = files.length + existingFiles.length;

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Dropzone */}
            <div
                {...getRootProps()}
                className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-300 hover:border-indigo-400 bg-gray-50'
                    }
          ${totalFiles >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}
        `}
            >
                <input {...getInputProps()} disabled={totalFiles >= maxFiles} />
                <FaCloudUploadAlt className="mx-auto text-5xl text-gray-400 mb-4" />

                {isDragActive ? (
                    <p className="text-lg text-indigo-600 font-medium">Drop files here...</p>
                ) : (
                    <>
                        <p className="text-lg text-gray-700 font-medium mb-2">
                            Drag & drop files here, or click to select
                        </p>
                        <p className="text-sm text-gray-500">
                            Max {maxFiles} files, up to {maxSize / 1024 / 1024}MB each
                        </p>
                        {totalFiles > 0 && (
                            <p className="text-sm text-gray-600 mt-2">
                                {totalFiles} / {maxFiles} files uploaded
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            {/* File Previews */}
            {files.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {files.map((file, index) => {
                        const Icon = getFileIcon(file);
                        const isImage = file.type.startsWith('image/');

                        return (
                            <div
                                key={index}
                                className="relative group border border-gray-200 rounded-lg overflow-hidden bg-white"
                            >
                                {/* Preview */}
                                <div className="aspect-square bg-gray-100 flex items-center justify-center p-4">
                                    {isImage && file.preview ? (
                                        <Image
                                            src={file.preview}
                                            alt={file.name}
                                            fill
                                            className="object-cover"
                                        />
                                    ) : (
                                        <Icon className="text-4xl text-gray-400" />
                                    )}
                                </div>

                                {/* File Info */}
                                <div className="p-2 bg-white">
                                    <p className="text-xs text-gray-700 truncate" title={file.name}>
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {(file.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>

                                {/* Remove Button */}
                                <button
                                    onClick={() => removeFile(index)}
                                    className="
                    absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full
                    opacity-0 group-hover:opacity-100 transition-opacity
                    hover:bg-red-600
                  "
                                    title="Remove file"
                                >
                                    <FaTimes className="text-sm" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Existing Files (from server) */}
            {existingFiles.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">Existing Files</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {existingFiles.map((url, index) => (
                            <div
                                key={index}
                                className="relative border border-gray-200 rounded-lg overflow-hidden"
                            >
                                <div className="aspect-square bg-gray-100">
                                    <Image
                                        src={url}
                                        alt={`Existing file ${index + 1}`}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
