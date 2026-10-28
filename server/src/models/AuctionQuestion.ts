import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuctionQuestion extends Document {
  listing: Types.ObjectId;
  asker: Types.ObjectId;
  question: string;
  answer?: string;
  answeredBy?: Types.ObjectId;
  answeredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AuctionQuestionSchema = new Schema<IAuctionQuestion>(
  {
    listing: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    asker: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    question: { type: String, required: true, trim: true, maxlength: 1000 },
    answer: { type: String, trim: true, maxlength: 1000 },
    answeredBy: { type: Schema.Types.ObjectId, ref: 'User' },
    answeredAt: { type: Date },
  },
  { timestamps: true }
);

export const AuctionQuestion = mongoose.model<IAuctionQuestion>('AuctionQuestion', AuctionQuestionSchema);
