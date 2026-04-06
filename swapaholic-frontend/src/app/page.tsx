import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  FaGavel, FaShieldAlt, FaTruck, FaStar, FaUsers, 
  FaCheckCircle, FaArrowRight, FaSearch, FaCamera, FaClock 
} from 'react-icons/fa';
import { productsApi } from '../api/products';
import AuthRedirect from '../components/auth/AuthRedirect';
import RecentlyViewed from '../components/RecentlyViewed';
import HeroActions from '../components/home/HeroActions';

// Server Components can be async
export default async function HomePage() {
  let featuredProducts: any[] = [];
  
  try {
    // Fetch featured/trending products on the server
    featuredProducts = await productsApi.getFeaturedProducts(6);
  } catch (error) {
    console.error('Error fetching featured products on server:', error);
    // Keep it empty, UI handles empty state
  }

  const categories = [
    { name: 'Electronics', icon: '💻' },
    { name: 'Fashion', icon: '👗' },
    { name: 'Home & Garden', icon: '🏡' },
    { name: 'Sports', icon: '⚽' },
    { name: 'Collectibles', icon: '🎨' },
    { name: 'Automotive', icon: '🚗' },
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

  const sectionClass = "md:sticky md:top-0 md:h-[100dvh] w-full relative overflow-y-auto overflow-x-hidden scrollbar-hide";

  return (
    <div className="bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative selection:bg-indigo-200">
      {/* Client-side logic for role-based redirect */}
      <AuthRedirect />

      {/* Hero Section */}
      <section className={`${sectionClass} z-[1] bg-slate-50 dark:bg-slate-950 flex flex-col justify-center`}>
        {/* Subtle mesh background element */}
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
          <div className="absolute top-0 -left-1/4 w-1/2 h-full bg-linear-to-tr from-indigo-100 to-purple-50 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-soft-light"></div>
          <div className="absolute bottom-0 -right-1/4 w-1/2 h-full bg-linear-to-bl from-pink-100 to-indigo-100 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-soft-light"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center flex flex-col items-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-sm font-medium text-slate-600 dark:text-slate-400 mb-8 hover:shadow-md transition-shadow cursor-default">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            The Premium Marketplace for Second-hand Treasures
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-slate-900 dark:text-white leading-[1.1]">
            Curated Deals.<br />
            <span className="bg-clip-text text-transparent bg-linear-to-r from-indigo-600 via-purple-600 to-indigo-600 animate-gradient-x">
              Extraordinary Finds.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 font-light leading-relaxed">
            Experience the future of re-commerce. Join our exclusive community to buy, sell, and discover unique items with uncompromised trust.
          </p>

          <HeroActions />

          {/* Trust Indicators */}
          <div className="mt-20 flex flex-wrap justify-center gap-8 md:gap-16 pt-10 border-t border-slate-200/60 dark:border-slate-800/60 w-full max-w-3xl">
            <div className="flex items-center gap-3">
              <FaShieldAlt className="text-indigo-500 text-xl" />
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">Verified Sellers</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Every seller is vetted</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FaCheckCircle className="text-emerald-500 text-xl" />
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">Quality Checked</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Items inspected before delivery</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <FaTruck className="text-amber-500 text-xl" />
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">Tracked Shipping</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Real-time delivery updates</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Auctions */}
      <section className={`${sectionClass} z-[2] bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-[0_-20px_50px_rgba(0,0,0,0.03)]`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">Trending Now</h2>
              <p className="text-lg text-slate-500 dark:text-slate-400 font-light">Handpicked auctions ending soon</p>
            </div>

            <Link href="/products" className="group flex items-center gap-2 text-indigo-600 font-semibold hover:text-indigo-700 transition-colors">
              View All <FaArrowRight className="group-hover:translate-x-1 transition-transform text-sm" />
            </Link>
          </div>

          {featuredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredProducts.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`} className="block group">
                <div className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-700 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-900 p-6 flex items-center justify-center">
                      {product.images?.[0] ? (
                        <Image
                          src={product.images[0]}
                          alt={product.title}
                          fill
                          className="object-contain p-6 group-hover:scale-105 transition-transform duration-500 mix-blend-multiply dark:mix-blend-normal"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-300">
                          <FaCamera className="w-12 h-12 mb-2" />
                          <span className="text-xs font-medium">No Image</span>
                        </div>
                      )}
                    <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-900 dark:text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                      {getTimeRemaining(product.auctionEndTime)}
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">{product.title}</h3>
                    <div className="mt-auto flex justify-between items-end pt-4 border-t border-slate-100 dark:border-slate-700">
                      <div>
                        <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Current Bid</p>
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">৳{product.currentBid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>

                      <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors text-slate-400">
                        <FaArrowRight className="-rotate-45" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
              <FaGavel className="text-4xl text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 dark:text-white mb-2">No auctions right now</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">Check back soon for exciting new listings!</p>
              <Link href="/products" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-medium hover:bg-indigo-700 transition-all">
                Browse All Products <FaArrowRight />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Recently Viewed (Client Component) */}
      <RecentlyViewed />

      {/* Categories Bento Grid */}
      <section className={`${sectionClass} z-[3] bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shadow-[0_-20px_50px_rgba(0,0,0,0.03)]`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">Explore Categories</h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-light max-w-2xl mx-auto">Discover a world of pre-loved items across our most popular departments</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-fade-in">
            {categories.map((category) => (
              <Link 
                key={category.name} 
                href={`/products?category=${category.name}`}
                className="group relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 p-6 flex flex-col justify-between"
              >
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-indigo-50 dark:bg-indigo-950/30 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                <div className="text-4xl mb-4 transform group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 origin-bottom-left relative z-10">
                  {category.icon}
                </div>
                <div className="relative z-10">
                  <h3 className="font-bold text-slate-900 dark:text-white text-lg tracking-tight mb-1">{category.name}</h3>
                  <p className="text-sm font-medium text-indigo-500 group-hover:text-indigo-600 transition-colors">Explore →</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className={`${sectionClass} z-[4] bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shadow-[0_-20px_50px_rgba(0,0,0,0.03)]`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 dark:text-white tracking-tight mb-4">The Swapaholic Way</h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-light">A seamless process designed for trust and simplicity</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-linear-to-r from-slate-100 via-indigo-100 to-slate-100 dark:from-slate-800 dark:via-indigo-900 dark:to-slate-800 z-0"></div>

            {howItWorks.map((item) => (
              <div key={item.step} className="relative z-10 flex flex-col items-center text-center group">
                <div className="w-24 h-24 rounded-3xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-center text-indigo-600 dark:text-indigo-400 text-3xl mb-6 group-hover:-translate-y-2 transition-transform duration-300 relative overflow-hidden">
                  <div className="absolute inset-0 bg-indigo-50/50 dark:bg-indigo-900/50 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                  <item.icon className="relative z-10" />
                </div>
                <div className="text-xs font-bold text-indigo-600 tracking-widest uppercase mb-2">Step 0{item.step}</div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-3">{item.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 font-light leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className={`${sectionClass} z-[5] bg-slate-900 border-t border-slate-800 shadow-[0_-20px_50px_rgba(0,0,0,0.2)] text-white`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
                Built on <span className="text-indigo-400">Trust</span>.<br />
                Designed for <span className="text-purple-400">You</span>.
              </h2>
              <p className="text-lg text-slate-400 font-light mb-8 max-w-lg leading-relaxed">
                We've engineered every aspect of Swapaholic to provide a secure, transparent, and joyful experience. Your peace of mind is our core feature.
              </p>

              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-green-400 border border-slate-700">
                    <FaShieldAlt className="text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">Secure Escrow Payments</h3>
                    <p className="text-slate-400 font-light">Funds are held safely until the item is received and approved.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-blue-400 border border-slate-700">
                    <FaUsers className="text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">Verified Community</h3>
                    <p className="text-slate-400 font-light">Mandatory identity verification keeps scammers off the platform.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-purple-400 border border-slate-700">
                    <FaTruck className="text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">Integrated Logistics</h3>
                    <p className="text-slate-400 font-light">Door-to-door tracking with our premium delivery partners.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative hidden lg:block h-[500px]">
              <div className="absolute inset-0 bg-linear-to-br from-indigo-500/20 to-purple-500/20 rounded-3xl border border-white/10 backdrop-blur-3xl overflow-hidden flex items-center justify-center">
                <div className="w-64 h-64 bg-indigo-500/30 rounded-full blur-[80px]"></div>
                <div className="absolute w-full h-full border border-white/5 rounded-3xl"></div>

                <div className="absolute bg-slate-900/80 backdrop-blur-xl border border-slate-700 w-72 rounded-2xl p-6 shadow-2xl transform rotate-3 -translate-y-4">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center"><FaCheckCircle className="text-green-400 text-xl" /></div>
                    <div>
                      <div className="font-bold text-white">Payment Secured</div>
                      <div className="text-xs text-slate-400">Escrow activated</div>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full w-full overflow-hidden">
                    <div className="h-full bg-green-400 w-full"></div>
                  </div>
                </div>

                <div className="absolute bg-slate-900/80 backdrop-blur-xl border border-slate-700 w-64 rounded-2xl p-4 shadow-2xl transform -rotate-6 translate-y-24 -translate-x-12">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-slate-300">Seller Trust Score</span>
                    <span className="text-sm font-bold text-white">4.9/5.0</span>
                  </div>
                  <div className="flex gap-1 mt-2 text-amber-400 text-xs">
                    <FaStar /><FaStar /><FaStar /><FaStar /><FaStar />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={`${sectionClass} z-[6] bg-slate-950 dark:bg-black flex items-center justify-center`}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px]"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            Ready to dive in?
          </h2>
          <p className="text-xl mb-10 text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
            Join thousands of users turning unneeded items into cash, and finding premium pre-loved deals every day.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/register">
              <button className="px-10 py-5 bg-white dark:bg-slate-900 text-slate-950 dark:text-white rounded-2xl font-bold text-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-[0_0_40px_rgba(255,255,255,0.2)] hover:shadow-[0_0_60px_rgba(255,255,255,0.3)]">
                Create Free Account
              </button>
            </Link>
          </div>
          <p className="mt-8 text-sm text-slate-500 font-medium">No credit card required. Setup takes 2 minutes.</p>
        </div>
      </section>
    </div>
  );
}
