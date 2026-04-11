'use client';

import { useState } from 'react';
import { useAppSelector } from '../../store/hooks';

const getStoredValue = (key: string) => {
    if (typeof window === 'undefined') {
        return null;
    }

    return localStorage.getItem(key);
};

export default function AuthDebug() {
    const { user, isAuthenticated, accessToken } = useAppSelector((state) => state.auth);
    const [localStorageToken] = useState<string | null>(() => getStoredValue('accessToken'));
    const [localStorageUser] = useState<string | null>(() => getStoredValue('user'));

    return (
        <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-md z-50">
            <h3 className="font-bold mb-2">Auth Debug</h3>
            <div className="space-y-1">
                <div>isAuthenticated: <span className="text-green-400">{isAuthenticated ? 'true' : 'false'}</span></div>
                <div>user: <span className="text-blue-400">{user ? user.email : 'null'}</span></div>
                <div>role: <span className="text-purple-400">{user?.role || 'null'}</span></div>
                <div>Redux Token: <span className="text-yellow-400">{accessToken ? `${accessToken.substring(0, 20)}...` : 'null'}</span></div>
                <div>LocalStorage Token: <span className="text-yellow-400">{localStorageToken ? `${localStorageToken.substring(0, 20)}...` : 'null'}</span></div>
                <div>LocalStorage User: <span className="text-blue-400">{localStorageUser ? `${localStorageUser.substring(0, 30)}...` : 'null'}</span></div>
            </div>
        </div>
    );
}
