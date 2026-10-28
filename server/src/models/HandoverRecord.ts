import mongoose, { Schema, Document, Types } from 'mongoose';

export type HandoverStatus =
  | 'PENDING_MEETING'
  | 'CONFIRMED'
  | 'FAILED_BUYER_NO_SHOW'
  | 'FAILED_SELLER_NO_SHOW'
  | 'FAILED_ITEM_MISMATCH';

export interface IHandoverRecord extends Document {
  listing: Types.ObjectId;
  seller: Types.ObjectId;
  buyer: Types.ObjectId;
  agreedPricePaise: number;
  verificationCode: string;
  status: HandoverStatus;
  handoverLocation?: string;
  confirmedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const HandoverRecordSchema = new Schema<IHandoverRecord>(
  {
    listing: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, unique: true },
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    buyer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    agreedPricePaise: { type: Number, required: true },
    verificationCode: { type: String, required: true },
    status: {
      type: String,
      enum: [
        'PENDING_MEETING',
        'CONFIRMED',
        'FAILED_BUYER_NO_SHOW',
        'FAILED_SELLER_NO_SHOW',
        'FAILED_ITEM_MISMATCH',
      ],
      default: 'PENDING_MEETING',
      index: true,
    },
    handoverLocation: { type: String, default: 'Campus Student Center' },
    confirmedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

export const HandoverRecord = mongoose.model<IHandoverRecord>('HandoverRecord', HandoverRecordSchema);
