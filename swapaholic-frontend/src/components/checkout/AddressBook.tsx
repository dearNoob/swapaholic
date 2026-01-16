'use client';

import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaCheck, FaMapMarkerAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { shippingApi, Address, CreateAddressData } from '@/api/shipping';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandler';

interface AddressBookProps {
    addresses?: Address[];
    onAddressSelect?: (address: Address) => void;
    onAddAddress?: (address: Omit<Address, 'id'>) => void;
    onEditAddress?: (id: string, address: Partial<Address>) => void;
    onDeleteAddress?: (id: string) => void;
    onSetDefault?: (id: string) => void;
}

export default function AddressBook({
    addresses: initialAddresses,
    onAddressSelect,
    onAddAddress,
    onEditAddress,
    onDeleteAddress,
    onSetDefault
}: AddressBookProps) {
    const [addresses, setAddresses] = useState<Address[]>(initialAddresses || []);
    const [isLoading, setIsLoading] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(
        addresses.find(a => a.isDefault)?.id || null
    );
    const [formData, setFormData] = useState<Partial<CreateAddressData>>({});

    // Fetch addresses on mount if not provided
    useEffect(() => {
        if (!initialAddresses) {
            fetchAddresses();
        }
    }, [initialAddresses]);

    const fetchAddresses = async () => {
        setIsLoading(true);
        try {
            const data = await shippingApi.getAddresses();
            setAddresses(data);
        } catch (error) {
            showErrorToast(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (editingId) {
                const updated = await shippingApi.updateAddress(editingId, formData);
                setAddresses(addresses.map(a => a.id === editingId ? updated : a));
                onEditAddress?.(editingId, formData);
                showSuccessToast('Address updated');
                setEditingId(null);
            } else {
                const newAddress = await shippingApi.addAddress(formData as CreateAddressData);
                setAddresses([...addresses, newAddress]);
                onAddAddress?.(formData as any);
                showSuccessToast('Address added');
                setIsAdding(false);
            }
            setFormData({});
        } catch (error) {
            showErrorToast(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this address?')) return;

        setIsLoading(true);
        try {
            await shippingApi.deleteAddress(id);
            setAddresses(addresses.filter(a => a.id !== id));
            onDeleteAddress?.(id);
            showSuccessToast('Address deleted');
        } catch (error) {
            showErrorToast(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSetDefault = async (id: string) => {
        setIsLoading(true);
        try {
            await shippingApi.setDefaultAddress(id);
            setAddresses(addresses.map(a => ({ ...a, isDefault: a.id === id })));
            onSetDefault?.(id);
            showSuccessToast('Default address updated');
        } catch (error) {
            showErrorToast(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelect = (address: Address) => {
        setSelectedId(address.id);
        onAddressSelect?.(address);
    };

    const AddressForm = () => (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                    type="text"
                    placeholder="Full Name *"
                    value={formData.fullName || ''}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                />
                <input
                    type="tel"
                    placeholder="Phone Number *"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                />
            </div>

            <input
                type="text"
                placeholder="Address Line 1 *"
                value={formData.addressLine1 || ''}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
            />

            <input
                type="text"
                placeholder="Address Line 2 (Optional)"
                value={formData.addressLine2 || ''}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <input
                    type="text"
                    placeholder="City *"
                    value={formData.city || ''}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                />
                <input
                    type="text"
                    placeholder="State *"
                    value={formData.state || ''}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                />
                <input
                    type="text"
                    placeholder="Postal Code *"
                    value={formData.postalCode || ''}
                    onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                />
            </div>

            <select
                value={formData.country || 'US'}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
            >
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="UK">United Kingdom</option>
            </select>

            <div className="flex gap-3">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                    {isLoading ? 'Saving...' : (editingId ? 'Update Address' : 'Save Address')}
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setIsAdding(false);
                        setEditingId(null);
                        setFormData({});
                    }}
                    className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                    Cancel
                </button>
            </div>
        </form>
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-900">Saved Addresses</h3>
                <button
                    onClick={() => setIsAdding(true)}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                    <FaPlus />
                    Add New Address
                </button>
            </div>

            {(isAdding || editingId) && <AddressForm />}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {addresses.map((address) => (
                    <div
                        key={address.id}
                        className={`
              relative border-2 rounded-lg p-4 cursor-pointer transition-all
              ${selectedId === address.id
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-gray-200 hover:border-indigo-300'
                            }
            `}
                        onClick={() => handleSelect(address)}
                    >
                        {selectedId === address.id && (
                            <div className="absolute top-4 right-4 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                                <FaCheck className="text-white text-xs" />
                            </div>
                        )}

                        {address.isDefault && (
                            <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full mb-2">
                                Default
                            </span>
                        )}

                        <div className="pr-10">
                            <h4 className="font-semibold text-gray-900 mb-1">{address.fullName}</h4>
                            <p className="text-sm text-gray-600">{address.addressLine1}</p>
                            {address.addressLine2 && (
                                <p className="text-sm text-gray-600">{address.addressLine2}</p>
                            )}
                            <p className="text-sm text-gray-600">
                                {address.city}, {address.state} {address.postalCode}
                            </p>
                            <p className="text-sm text-gray-600">{address.country}</p>
                            <p className="text-sm text-gray-600 mt-2">Phone: {address.phone}</p>
                        </div>

                        <div className="flex gap-2 mt-4 pt-4 border-t">
                            {!address.isDefault && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSetDefault(address.id);
                                    }}
                                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                                    disabled={isLoading}
                                >
                                    Set as Default
                                </button>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingId(address.id);
                                    setFormData(address);
                                }}
                                className="text-xs text-gray-600 hover:text-gray-700 font-medium flex items-center gap-1"
                            >
                                <FaEdit />
                                Edit
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(address.id);
                                }}
                                className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
                                disabled={isLoading}
                            >
                                <FaTrash />
                                Delete
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {addresses.length === 0 && !isAdding && (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <FaMapMarkerAlt className="text-4xl text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No saved addresses yet</p>
                    <button
                        onClick={() => setIsAdding(true)}
                        className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        Add your first address
                    </button>
                </div>
            )}
        </div>
    );
}
