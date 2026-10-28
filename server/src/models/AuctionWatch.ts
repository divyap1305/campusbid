import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuctionWatch extends Document {
  user: Types.ObjectId;
  listing: Types.ObjectId;
  closingAlertSentAt?: Date;
  createdAt: Date;
}

const AuctionWatchSchema = new Schema<IAuctionWatch>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    listing: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    closingAlertSentAt: { type: Date },
  },
  { timestamps: true }
);

AuctionWatchSchema.index({ user: 1, listing: 1 }, { unique: true });

export const AuctionWatch = mongoose.model<IAuctionWatch>('AuctionWatch', AuctionWatchSchema);
