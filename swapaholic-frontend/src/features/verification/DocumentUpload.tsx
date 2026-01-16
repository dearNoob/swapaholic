'use client';

import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { verificationApi } from '../../api/verification';
import { FaUpload, FaFileAlt } from 'react-icons/fa';
import { Button } from '../../components/ui/Button';

export const DocumentUpload = () => {
    const [files, setFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleUpload = async () => {
        if (files.length === 0) {
            toast.error('Please select a document to upload');
            return;
        }
        const formData = new FormData();
        files.forEach((file) => formData.append('documents', file));
        try {
            setIsUploading(true);
            await verificationApi.uploadDocuments(formData);
            toast.success('Documents uploaded successfully');
            setFiles([]);
        } catch (err) {
            console.error(err);
            toast.error('Failed to upload documents');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <FaFileAlt /> Upload Identity Documents
            </h2>
            <input
                type="file"
                accept="image/*,application/pdf"
                multiple
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {files.length > 0 && (
                <ul className="mt-3 mb-4 list-disc list-inside text-sm text-gray-600">
                    {files.map((f, i) => (
                        <li key={i}>{f.name}</li>
                    ))}
                </ul>
            )}
            <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex items-center gap-2"
            >
                <FaUpload /> {isUploading ? 'Uploading...' : 'Upload'}
            </Button>
        </div>
    );
};
