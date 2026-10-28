export type ListingCategory = 
  | 'CYCLES' 
  | 'CALCULATORS' 
  | 'TEXTBOOKS' 
  | 'ELECTRONICS' 
  | 'DORM_LIVING' 
  | 'LAB_EQUIPMENT' 
  | 'OTHER';

export type ListingCondition = 
  | 'BRAND_NEW' 
  | 'LIKE_NEW' 
  | 'GOOD' 
  | 'FAIR';

export type AuctionStatus = 
  | 'DRAFT' 
  | 'ACTIVE' 
  | 'PENDING_SELLER_DECISION' 
  | 'RESERVED_PENDING_HANDOVER' 
  | 'COMPLETED' 
  | 'CANCELLED' 
  | 'UNSOLD' 
  | 'FAILED_PICKUP';

export interface User {
  id: string;
  name: string;
  email: string;
  studentId: string;
  department: string;
  phoneNumber?: string;
  role: 'STUDENT' | 'ADMIN';
  isCampusVerified: boolean;
  avatarUrl?: string;
}

export interface Listing {
  id: string;
  title: string;
  category: ListingCategory;
  description: string;
  condition: ListingCondition;
  photos: string[];
  startingPricePaise: number;
  minIncrementPaise: number;
  currentPricePaise: number;
  status: AuctionStatus;
  closingTime: string;
  originalClosingTime?: string;
  bidCount: number;
  extensionCount: number;
  cancellationReason?: string;
  winner?: string;
  winningPricePaise?: number;
  seller?: {
    id: string;
    name: string;
    department?: string;
    avatarUrl?: string;
    isCampusVerified?: boolean;
    phoneNumber?: string;
    email?: string;
  };
  leadingBidderName?: string | null;
}

export interface Bid {
  id: string;
  amountPaise: number;
  serverTimestamp: string;
  isAutoBid: boolean;
  maxAuthorizedPaise?: number;
  status: 'ACCEPTED' | 'OUTBID' | 'RETRACTED';
  bidderDisplayName: string;
}

export interface AuctionQuestion {
  id: string;
  question: string;
  answer?: string;
  createdAt: string;
  answeredAt?: string;
  askerName: string;
  answeredByName?: string | null;
}

export interface SavedSearch {
  _id: string;
  query?: string;
  category?: string;
  maxPricePaise?: number;
  condition?: string;
  createdAt: string;
}

export interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export interface HandoverRecord {
  _id: string;
  listing: any;
  seller: any;
  buyer: any;
  agreedPricePaise: number;
  verificationCode: string;
  status: 'PENDING_MEETING' | 'CONFIRMED' | 'FAILED_BUYER_NO_SHOW' | 'FAILED_SELLER_NO_SHOW' | 'FAILED_ITEM_MISMATCH';
  handoverLocation: string;
  confirmedAt?: string;
  notes?: string;
}
