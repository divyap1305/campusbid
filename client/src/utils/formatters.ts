import { ListingCategory, ListingCondition, AuctionStatus } from '../types/index.js';

export const formatRupees = (paise?: number): string => {
  if (paise === undefined || paise === null) return '₹0';
  const rupees = Math.round(paise / 100);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(rupees);
};

export const formatTimeRemaining = (closingTimeStr: string | Date): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
  isSoftCloseZone: boolean;
  formattedText: string;
} => {
  const target = new Date(closingTimeStr).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalSeconds: 0,
      isExpired: true,
      isSoftCloseZone: false,
      formattedText: 'Auction Closed',
    };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const isSoftCloseZone = totalSeconds <= 30;

  let formattedText = '';
  if (days > 0) {
    formattedText = `${days}d ${hours}h left`;
  } else if (hours > 0) {
    formattedText = `${hours}h ${minutes}m left`;
  } else if (minutes > 0) {
    formattedText = `${minutes}m ${seconds}s left`;
  } else {
    formattedText = `${seconds}s left`;
  }

  return {
    days,
    hours,
    minutes,
    seconds,
    totalSeconds,
    isExpired: false,
    isSoftCloseZone,
    formattedText,
  };
};

export const getCategoryLabel = (category: string): string => {
  const map: Record<string, string> = {
    CYCLES: 'Bicycles & Mobility',
    CALCULATORS: 'Calculators & Math',
    TEXTBOOKS: 'Textbooks & Academic',
    ELECTRONICS: 'Electronics & Tech',
    DORM_LIVING: 'Dorm & Living',
    LAB_EQUIPMENT: 'Lab Gear & Kits',
    OTHER: 'Campus Essentials',
  };
  return map[category] || category;
};

export const getConditionBadge = (condition: ListingCondition): { label: string; color: string } => {
  switch (condition) {
    case 'BRAND_NEW':
      return { label: 'Brand New', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    case 'LIKE_NEW':
      return { label: 'Like New', color: 'bg-blue-100 text-blue-800 border-blue-200' };
    case 'GOOD':
      return { label: 'Good', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    case 'FAIR':
      return { label: 'Fair Condition', color: 'bg-slate-100 text-slate-800 border-slate-200' };
    default:
      return { label: condition, color: 'bg-slate-100 text-slate-800 border-slate-200' };
  }
};

export const getStatusBadge = (status: AuctionStatus): { label: string; color: string } => {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Live Auction', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'PENDING_SELLER_DECISION':
      return { label: 'Seller Reviewing', color: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'RESERVED_PENDING_HANDOVER':
      return { label: 'Reserved for Handover', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'COMPLETED':
      return { label: 'Sold & Handed Over', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'CANCELLED':
      return { label: 'Cancelled', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'UNSOLD':
      return { label: 'Unsold (No Bids)', color: 'bg-slate-100 text-slate-500 border-slate-200' };
    case 'FAILED_PICKUP':
      return { label: 'Failed Pickup', color: 'bg-rose-50 text-rose-700 border-rose-200' };
    default:
      return { label: status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
  }
};
