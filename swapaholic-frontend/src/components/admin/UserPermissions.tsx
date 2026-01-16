'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { FaUserShield, FaUserCog, FaUser, FaSearch, FaEdit, FaSave, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface User {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    role: 'admin' | 'moderator' | 'user';
    status: 'active' | 'suspended' | 'banned';
    joinedAt: Date;
}

interface UserPermissionsProps {
    users?: User[];
    onRoleChange?: (userId: string, newRole: User['role']) => void;
    onStatusChange?: (userId: string, newStatus: User['status']) => void;
}

export default function UserPermissions({
    users = [],
    onRoleChange,
    onStatusChange
}: UserPermissionsProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<'all' | User['role']>('all');
    const [editingUser, setEditingUser] = useState<string | null>(null);
    const [tempRole, setTempRole] = useState<User['role']>('user');
    const [tempStatus, setTempStatus] = useState<User['status']>('active');

    const filteredUsers = users.filter(user => {
        const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = filterRole === 'all' || user.role === filterRole;
        return matchesSearch && matchesRole;
    });

    const getRoleIcon = (role: User['role']) => {
        const icons = {
            admin: <FaUserShield className="text-red-600" />,
            moderator: <FaUserCog className="text-blue-600" />,
            user: <FaUser className="text-gray-600" />
        };
        return icons[role];
    };

    const getRoleBadge = (role: User['role']) => {
        const badges = {
            admin: 'bg-red-100 text-red-700',
            moderator: 'bg-blue-100 text-blue-700',
            user: 'bg-gray-100 text-gray-700'
        };
        return badges[role];
    };

    const getStatusBadge = (status: User['status']) => {
        const badges = {
            active: 'bg-green-100 text-green-700',
            suspended: 'bg-yellow-100 text-yellow-700',
            banned: 'bg-red-100 text-red-700'
        };
        return badges[status];
    };

    const handleEditStart = (user: User) => {
        setEditingUser(user.id);
        setTempRole(user.role);
        setTempStatus(user.status);
    };

    const handleSave = (userId: string) => {
        const user = users.find(u => u.id === userId);
        if (!user) return;

        if (tempRole !== user.role) {
            onRoleChange?.(userId, tempRole);
            toast.success(`Role updated to ${tempRole}`);
        }
        if (tempStatus !== user.status) {
            onStatusChange?.(userId, tempStatus);
            toast.success(`Status updated to ${tempStatus}`);
        }
        setEditingUser(null);
    };

    const handleCancel = () => {
        setEditingUser(null);
    };

    const roleStats = {
        admin: users.filter(u => u.role === 'admin').length,
        moderator: users.filter(u => u.role === 'moderator').length,
        user: users.filter(u => u.role === 'user').length
    };

    return (
        <div className="space-y-6">
            {/* Header & Stats */}
            <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">User Permissions</h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <FaUserShield className="text-red-600 text-xl" />
                            </div>
                            <div>
                                <p className="text-sm text-red-600 font-medium">Admins</p>
                                <p className="text-2xl font-bold text-red-700">{roleStats.admin}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <FaUserCog className="text-blue-600 text-xl" />
                            </div>
                            <div>
                                <p className="text-sm text-blue-600 font-medium">Moderators</p>
                                <p className="text-2xl font-bold text-blue-700">{roleStats.moderator}</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-100 rounded-lg">
                                <FaUser className="text-gray-600 text-xl" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 font-medium">Users</p>
                                <p className="text-2xl font-bold text-gray-700">{roleStats.user}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by username or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value as any)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Roles</option>
                        <option value="admin">Admins</option>
                        <option value="moderator">Moderators</option>
                        <option value="user">Users</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Joined
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredUsers.map(user => {
                                const isEditing = editingUser === user.id;

                                return (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        {/* User */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                                                    {user.avatar ? (
                                                        <Image src={user.avatar} alt={user.username} width={40} height={40} className="object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                                                            {user.username[0].toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{user.username}</p>
                                                    <p className="text-sm text-gray-500">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Role */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {isEditing ? (
                                                <select
                                                    value={tempRole}
                                                    onChange={(e) => setTempRole(e.target.value as User['role'])}
                                                    className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    <option value="user">User</option>
                                                    <option value="moderator">Moderator</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                            ) : (
                                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getRoleBadge(user.role)}`}>
                                                    {getRoleIcon(user.role)}
                                                    {user.role}
                                                </span>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {isEditing ? (
                                                <select
                                                    value={tempStatus}
                                                    onChange={(e) => setTempStatus(e.target.value as User['status'])}
                                                    className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                >
                                                    <option value="active">Active</option>
                                                    <option value="suspended">Suspended</option>
                                                    <option value="banned">Banned</option>
                                                </select>
                                            ) : (
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusBadge(user.status)}`}>
                                                    {user.status}
                                                </span>
                                            )}
                                        </td>

                                        {/* Joined */}
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {user.joinedAt.toLocaleDateString()}
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            {isEditing ? (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleSave(user.id)}
                                                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                                        title="Save"
                                                    >
                                                        <FaSave />
                                                    </button>
                                                    <button
                                                        onClick={handleCancel}
                                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                                        title="Cancel"
                                                    >
                                                        <FaTimes />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleEditStart(user)}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                    title="Edit"
                                                >
                                                    <FaEdit />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredUsers.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <FaUser className="text-4xl mx-auto mb-3 text-gray-300" />
                        <p>No users found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
