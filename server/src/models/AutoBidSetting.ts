import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAutoBidSetting extends Document {
  listing: Types.ObjectId;
  bidder: Types.ObjectId;
  maxAuthorizedPaise: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AutoBidSettingSchema = new Schema<IAutoBidSetting>(
  {
    listing: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    bidder: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    maxAuthorizedPaise: { type: Number, required: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

// Unique active ceiling per user per listing
AutoBidSettingSchema.index({ listing: 1, bidder: 1 }, { unique: true });

export const AutoBidSetting = mongoose.model<IAutoBidSetting>('AutoBidSetting', AutoBidSettingSchema);
