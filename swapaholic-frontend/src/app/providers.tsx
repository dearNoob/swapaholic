'use client';

import { Provider } from 'react-redux';
import { store } from '../store/store';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <Provider store={store}>
            {children}
            <ToastContainer 
                position="top-right" 
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                rtl={false}
                pauseOnFocusLoss={false}
                draggable
                pauseOnHover
                theme="light"
                limit={3}
                toastStyle={{
                    borderRadius: '12px',
                    fontFamily: 'var(--font-inter), Inter, sans-serif',
                    fontSize: '14px',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                }}
            />
        </Provider>
    );
}
