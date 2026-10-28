import mongoose, { Schema, Document, Types } from 'mongoose';

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

export interface IListing extends Document {
  title: string;
  category: ListingCategory;
  description: string;
  condition: ListingCondition;
  photos: string[];
  startingPricePaise: number;
  minIncrementPaise: number;
  currentPricePaise: number;
  seller: Types.ObjectId;
  status: AuctionStatus;
  closingTime: Date;
  originalClosingTime: Date;
  leadingBid?: Types.ObjectId;
  leadingBidder?: Types.ObjectId;
  bidCount: number;
  cancellationReason?: string;
  winner?: Types.ObjectId;
  winningPricePaise?: number;
  extensionCount: number;
  sellerDecisionNote?: string;
  relistedFrom?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ListingSchema = new Schema<IListing>(
  {
    title: { type: String, required: true, trim: true, index: true },
    category: {
      type: String,
      required: true,
      enum: ['CYCLES', 'CALCULATORS', 'TEXTBOOKS', 'ELECTRONICS', 'DORM_LIVING', 'LAB_EQUIPMENT', 'OTHER'],
      index: true,
    },
    description: { type: String, required: true, trim: true },
    condition: {
      type: String,
      required: true,
      enum: ['BRAND_NEW', 'LIKE_NEW', 'GOOD', 'FAIR'],
      index: true,
    },
    photos: [{ type: String }],
    startingPricePaise: { type: Number, required: true, min: 100 }, // Min ₹1.00
    minIncrementPaise: { type: Number, required: true, min: 1, default: 2000 }, // Default ₹20.00
    currentPricePaise: { type: Number, required: true },
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      required: true,
      enum: [
        'DRAFT',
        'ACTIVE',
        'PENDING_SELLER_DECISION',
        'RESERVED_PENDING_HANDOVER',
        'COMPLETED',
        'CANCELLED',
        'UNSOLD',
        'FAILED_PICKUP',
      ],
      default: 'ACTIVE',
      index: true,
    },
    closingTime: { type: Date, required: true, index: true },
    originalClosingTime: { type: Date, required: true },
    leadingBid: { type: Schema.Types.ObjectId, ref: 'Bid' },
    leadingBidder: { type: Schema.Types.ObjectId, ref: 'User' },
    bidCount: { type: Number, default: 0 },
    cancellationReason: { type: String },
    winner: { type: Schema.Types.ObjectId, ref: 'User' },
    winningPricePaise: { type: Number },
    extensionCount: { type: Number, default: 0 },
    sellerDecisionNote: { type: String },
    relistedFrom: { type: Schema.Types.ObjectId, ref: 'Listing' },
  },
  { timestamps: true }
);

// Compound index for active auctions closing soon
ListingSchema.index({ status: 1, closingTime: 1 });
ListingSchema.index({ status: 1, currentPricePaise: 1 });
ListingSchema.index({ relistedFrom: 1 }, { unique: true, sparse: true });
// Full-text search index for search discovery
ListingSchema.index({ title: 'text', description: 'text' });

export const Listing = mongoose.model<IListing>('Listing', ListingSchema);
