import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IBid extends Document {
  listing: Types.ObjectId;
  bidder: Types.ObjectId;
  amountPaise: number;
  serverTimestamp: Date;
  isAutoBid: boolean;
  maxAuthorizedPaise?: number;
  status: 'ACCEPTED' | 'OUTBID' | 'RETRACTED';
  ipAddress?: string;
  createdAt: Date;
}

const BidSchema = new Schema<IBid>(
  {
    listing: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    bidder: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amountPaise: { type: Number, required: true },
    serverTimestamp: { type: Date, required: true, default: Date.now },
    isAutoBid: { type: Boolean, default: false },
    maxAuthorizedPaise: { type: Number },
    status: { type: String, enum: ['ACCEPTED', 'OUTBID', 'RETRACTED'], default: 'ACCEPTED' },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BidSchema.index({ listing: 1, amountPaise: -1 });
BidSchema.index({ listing: 1, createdAt: -1 });

export const Bid = mongoose.model<IBid>('Bid', BidSchema);
