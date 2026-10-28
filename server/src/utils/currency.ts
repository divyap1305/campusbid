/**
 * Financial precision helpers for integer paise handling
 * 1 Rupee (₹) = 100 Paise
 */

export const paiseToRupees = (paise: number): number => {
  return Number((paise / 100).toFixed(2));
};

export const rupeesToPaise = (rupees: number): number => {
  return Math.round(rupees * 100);
};

export const formatCurrency = (paise: number): string => {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
};
