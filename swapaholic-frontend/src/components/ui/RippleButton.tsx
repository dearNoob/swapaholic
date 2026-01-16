'use client';

import { ButtonHTMLAttributes, MouseEvent, useRef } from 'react';

interface RippleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    variant?: 'primary' | 'secondary';
}

export default function RippleButton({
    children,
    variant = 'primary',
    className = '',
    onClick,
    ...props
}: RippleButtonProps) {
    const buttonRef = useRef<HTMLButtonElement>(null);

    const createRipple = (event: MouseEvent<HTMLButtonElement>) => {
        const button = event.currentTarget;
        const ripple = document.createElement('span');
        const diameter = Math.max(button.clientWidth, button.clientHeight);
        const radius = diameter / 2;

        const rect = button.getBoundingClientRect();
        ripple.style.width = ripple.style.height = `${diameter}px`;
        ripple.style.left = `${event.clientX - rect.left - radius}px`;
        ripple.style.top = `${event.clientY - rect.top - radius}px`;
        ripple.classList.add('ripple');

        const existingRipple = button.getElementsByClassName('ripple')[0];
        if (existingRipple) {
            existingRipple.remove();
        }

        button.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 600);

        if (onClick) {
            onClick(event);
        }
    };

    const baseStyles = 'relative overflow-hidden rounded-full px-6 py-3 font-medium transition-all duration-200';
    const variantStyles = {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
        secondary: 'border border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-800 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
    };

    return (
        <button
            ref={buttonRef}
            onClick={createRipple}
            className={`${baseStyles} ${variantStyles[variant]} ${className}`}
            {...props}
        >
            {children}
            <style jsx>{`
        .ripple {
          position: absolute;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.6);
          transform: scale(0);
          animation: ripple-animation 600ms ease-out;
          pointer-events: none;
        }

        @keyframes ripple-animation {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }
      `}</style>
        </button>
    );
}
