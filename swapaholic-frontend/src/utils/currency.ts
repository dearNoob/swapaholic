// Currency formatting utility for BDT (Bangladeshi Taka)

/**
 * Format a number as BDT currency
 * @param amount - The amount to format
 * @param showSymbol - Whether to show the ৳ symbol (default: true)
 * @returns Formatted currency string
 */
export const formatBDT = (amount: number, showSymbol: boolean = true): string => {
    const formatted = amount.toLocaleString('en-BD', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    return showSymbol ? `৳${formatted}` : formatted;
};

/**
 * Format currency with BDT symbol
 * @param amount - The amount to format
 * @returns Formatted currency string with ৳ symbol
 */
export const formatCurrency = (amount: number): string => {
    return formatBDT(amount);
};

// Currency symbol
export const CURRENCY_SYMBOL = '৳';
export const CURRENCY_CODE = 'BDT';
export const CURRENCY_NAME = 'Bangladeshi Taka';
