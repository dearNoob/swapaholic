'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaGavel, FaShieldAlt, FaTruck, FaStar, FaUsers, FaCheckCircle, FaArrowRight, FaSearch, FaHeart } from 'react-icons/fa';
import { productsApi } from '../api/products';
import { RatingStars } from '../components/ui/RatingStars';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 12500,
    totalAuctions: 8430,
    averageRating: 4.8,
  });

  useEffect(() => {
    fetchFeaturedProducts();
  }, []);

  const fetchFeaturedProducts = async () => {
    try {
      // Fetch featured/trending products
      const products = await productsApi.getFeaturedProducts(6);
      setFeaturedProducts(products);
    } catch (error) {
      console.error('Error fetching featured products:', error);
      // Mock featured products
      setFeaturedProducts([
        {
          id: '1',
          title: 'Vintage Canon AE-1 Camera',
          currentBid: 175.00,
          images: ['https://via.placeholder.com/300'],
          auctionEndTime: new Date(Date.now() + 86400000).toISOString(),
        },
        {
          id: '2',
          title: 'Apple MacBook Pro 2019',
          currentBid: 800.00,
          images: ['https://via.placeholder.com/300'],
          auctionEndTime: new Date(Date.now() + 86400000 * 2).toISOString(),
        },
        {
          id: '3',
          title: 'Nike Air Jordan 1 Retro',
          currentBid: 220.00,
          images: ['https://via.placeholder.com/300'],
          auctionEndTime: new Date(Date.now() + 86400000 * 3).toISOString(),
        },
      ]);
    }
  };

  const categories = [
    { name: 'Electronics', icon: '💻', count: 1250 },
    { name: 'Fashion', icon: '👗', count: 980 },
    { name: 'Home & Garden', icon: '🏡', count: 750 },
    { name: 'Sports', icon: '⚽', count: 620 },
    { name: 'Collectibles', icon: '🎨', count: 540 },
    { name: 'Automotive', icon: '🚗', count: 430 },
  ];

  const howItWorks = [
    {
      step: 1,
      title: 'Browse & Discover',
      description: 'Explore thousands of unique items from trusted sellers',
      icon: FaSearch,
    },
    {
      step: 2,
      title: 'Place Your Bid',
      description: 'Bid on items you love and compete in real-time auctions',
      icon: FaGavel,
    },
    {
      step: 3,
      title: 'Win & Purchase',
      description: 'Win auctions and securely complete your purchase',
      icon: FaCheckCircle,
    },
    {
      step: 4,
      title: 'Fast Delivery',
      description: 'Receive your items with tracked, reliable shipping',
      icon: FaTruck,
    },
  ];

  const getTimeRemaining = (endTime: string) => {
    const now = new Date().getTime();
    const end = new Date(endTime).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-linear-to-br from-indigo-600 via-purple-600 to-pink-500 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNnptMCA0YzEuMTA1IDAgMiAuODk1IDIgMnMtLjg5NSAyLTIgMi0yLS44OTUtMi0yIC44OTUtMiAyLTJ6IiBmaWxsPSIjZmZmIiBvcGFjaXR5PSIuMSIvPjwvZz48L3N2Zz4=')] opacity-20"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
              Discover Amazing Deals<br />
              <span className="text-yellow-300">Win Big on Auctions</span>
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-indigo-100 max-w-3xl mx-auto">
              Buy and sell second-hand items with confidence. Join thousands of happy users in the most trusted auction marketplace.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/products">
                <button className="px-8 py-4 bg-white text-indigo-600 rounded-lg font-bold text-lg hover:bg-indigo-50 transition transform hover:scale-105 shadow-xl flex items-center gap-2">
                  Browse Auctions <FaArrowRight />
                </button>
              </Link>
              <Link href="/seller/create-listing">
                <button className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white hover:text-indigo-600 transition transform hover:scale-105 flex items-center gap-2">
                  Start Selling <FaGavel />
                </button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-300">{stats.totalUsers.toLocaleString()}+</div>
                <div className="text-indigo-200 mt-2">Happy Users</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-yellow-300">{stats.totalAuctions.toLocaleString()}+</div>
                <div className="text-indigo-200 mt-2">Successful Auctions</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-4xl font-bold text-yellow-300">{stats.averageRating}</span>
                  <FaStar className="text-yellow-300 text-3xl" />
                </div>
                <div className="text-indigo-200 mt-2">Average Rating</div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* Featured Auctions */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">🔥 Trending Auctions</h2>
            <p className="text-xl text-gray-600">Don't miss out on these hot items!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {featuredProducts.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`}>
                <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow group cursor-pointer">
                  <div className="relative">
                    <img src={product.images[0]} alt={product.title} className="w-full h-48 object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
                      {getTimeRemaining(product.auctionEndTime)}
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">{product.title}</h3>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-500">Current Bid</p>
                        <p className="text-2xl font-bold text-indigo-600">৳{product.currentBid.toFixed(2)}</p>
                      </div>
                      <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
                        Bid Now
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center">
            <Link href="/products">
              <button className="px-8 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition">
                View All Auctions
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Browse by Category</h2>
            <p className="text-xl text-gray-600">Find exactly what you're looking for</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {categories.map((category) => (
              <Link key={category.name} href={`/products?category=${category.name}`}>
                <div className="bg-linear-to-br from-indigo-50 to-purple-50 rounded-lg p-6 text-center hover:shadow-lg transition-all cursor-pointer group border-2 border-transparent hover:border-indigo-500">
                  <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">{category.icon}</div>
                  <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>
                  <p className="text-sm text-gray-500">{category.count} items</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-linear-to-br from-gray-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Start buying and selling in 4 easy steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item) => (
              <div key={item.step} className="text-center group">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-600 text-white text-3xl mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <item.icon />
                </div>
                <div className="absolute -mt-10 ml-16 w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Swapaholic?</h2>
            <p className="text-xl text-gray-600">The trusted marketplace for second-hand treasures</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-lg p-8 border-2 border-green-200">
              <FaShieldAlt className="text-5xl text-green-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Secure Transactions</h3>
              <p className="text-gray-700">
                Your payments are protected with escrow services and buyer protection guarantees.
              </p>
            </div>

            <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-lg p-8 border-2 border-blue-200">
              <FaUsers className="text-5xl text-blue-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Verified Sellers</h3>
              <p className="text-gray-700">
                All sellers are verified and rated by our community for your peace of mind.
              </p>
            </div>

            <div className="bg-linear-to-br from-purple-50 to-pink-50 rounded-lg p-8 border-2 border-purple-200">
              <FaTruck className="text-5xl text-purple-600 mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Fast Shipping</h3>
              <p className="text-gray-700">
                Track your orders in real-time with reliable, fast delivery to your doorstep.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-linear-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Ready to Start Your Journey?</h2>
          <p className="text-xl mb-8 text-indigo-100">
            Join thousands of users buying and selling amazing items every day
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <button className="px-8 py-4 bg-white text-indigo-600 rounded-lg font-bold text-lg hover:bg-indigo-50 transition transform hover:scale-105 shadow-xl">
                Sign Up Free
              </button>
            </Link>
            <Link href="/products">
              <button className="px-8 py-4 bg-transparent border-2 border-white text-white rounded-lg font-bold text-lg hover:bg-white hover:text-indigo-600 transition transform hover:scale-105">
                Explore Now
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
