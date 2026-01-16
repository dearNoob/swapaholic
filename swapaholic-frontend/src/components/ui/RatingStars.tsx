import React from 'react';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';

interface RatingStarsProps {
    rating: number;
    maxRating?: number;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showNumber?: boolean;
    interactive?: boolean;
    onChange?: (rating: number) => void;
}

export const RatingStars: React.FC<RatingStarsProps> = ({
    rating,
    maxRating = 5,
    size = 'md',
    showNumber = false,
    interactive = false,
    onChange,
}) => {
    const [hoverRating, setHoverRating] = React.useState(0);

    const sizeClasses = {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-xl',
        xl: 'text-2xl',
    };

    const displayRating = interactive && hoverRating > 0 ? hoverRating : rating;

    const renderStar = (index: number) => {
        const starValue = index + 1;
        const isFull = displayRating >= starValue;
        const isHalf = !isFull && displayRating >= starValue - 0.5;

        const starClass = `${sizeClasses[size]} ${interactive ? 'cursor-pointer transition-colors hover:scale-110' : ''
            } ${isFull ? 'text-yellow-400' : isHalf ? 'text-yellow-400' : 'text-gray-300'}`;

        const handleClick = () => {
            if (interactive && onChange) {
                onChange(starValue);
            }
        };

        const handleMouseEnter = () => {
            if (interactive) {
                setHoverRating(starValue);
            }
        };

        const handleMouseLeave = () => {
            if (interactive) {
                setHoverRating(0);
            }
        };

        return (
            <span
                key={index}
                className={starClass}
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                {isFull ? <FaStar /> : isHalf ? <FaStarHalfAlt /> : <FaRegStar />}
            </span>
        );
    };

    return (
        <div className="flex items-center gap-1">
            <div className="flex items-center">
                {Array.from({ length: maxRating }).map((_, index) => renderStar(index))}
            </div>
            {showNumber && (
                <span className={`ml-2 ${sizeClasses[size]} text-gray-600 font-medium`}>
                    {rating.toFixed(1)}
                </span>
            )}
        </div>
    );
};
