import Link from 'next/link';
import { FaHome, FaSearch, FaExclamationTriangle } from 'react-icons/fa';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
            <div className="text-center max-w-md">
                {/* Animated 404 */}
                <div className="relative mb-8">
                    <h1 className="text-[8rem] font-extrabold text-slate-200 leading-none select-none">
                        404
                    </h1>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <FaExclamationTriangle className="text-5xl text-indigo-500 animate-bounce" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-slate-900 mb-3">
                    Page Not Found
                </h2>
                <p className="text-slate-500 mb-8 leading-relaxed">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved. 
                    Let&apos;s get you back on track.
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
                    >
                        <FaHome /> Go Home
                    </Link>
                    <Link
                        href="/products"
                        className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl font-medium hover:bg-slate-50 transition-all"
                    >
                        <FaSearch /> Browse Products
                    </Link>
                </div>
            </div>
        </div>
    );
}
