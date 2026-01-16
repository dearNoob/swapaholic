'use client';

import { FaStar } from 'react-icons/fa';

const testimonials = [
    {
        id: 1,
        name: 'Sarah Johnson',
        role: 'Frequent Buyer',
        avatar: '👩‍💼',
        rating: 5,
        text: 'Swapaholic made buying second-hand items so easy! The escrow system gave me peace of mind, and the quality verification is top-notch.',
    },
    {
        id: 2,
        name: 'Michael Chen',
        role: 'Seller',
        avatar: '👨‍💻',
        rating: 5,
        text: 'I\'ve sold over 20 items on Swapaholic. The bidding system is exciting, and payments are always secure and on time.',
    },
    {
        id: 3,
        name: 'Emily Rodriguez',
        role: 'Happy Customer',
        avatar: '👩‍🎨',
        rating: 4,
        text: 'Great platform for finding unique items at fair prices. The live bidding feature keeps things interesting!',
    },
];

export default function Testimonials() {
    return (
        <section className="w-full py-16">
            <h2 className="mb-12 text-center text-4xl font-bold text-gray-900 dark:text-white">
                What Our Users Say
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
                {testimonials.map((testimonial) => (
                    <div
                        key={testimonial.id}
                        className="rounded-xl bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-transform hover:scale-105 dark:bg-gray-800/80"
                    >
                        <div className="mb-4 flex items-center gap-4">
                            <div className="text-5xl">{testimonial.avatar}</div>
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                    {testimonial.name}
                                </h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {testimonial.role}
                                </p>
                            </div>
                        </div>
                        <div className="mb-3 flex gap-1">
                            {[...Array(5)].map((_, i) => (
                                <FaStar
                                    key={i}
                                    className={
                                        i < testimonial.rating
                                            ? 'text-yellow-400'
                                            : 'text-gray-300'
                                    }
                                />
                            ))}
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">
                            {testimonial.text}
                        </p>
                    </div>
                ))}
            </div>
        </section>
    );
}
