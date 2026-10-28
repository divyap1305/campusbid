import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAIActionConsent extends Document {
  user: Types.ObjectId;
  actionType: 'AUTO_BID_SETUP';
  listing: Types.ObjectId;
  maxAmountPaise: number;
  consentToken: string;
  status: 'PENDING' | 'CONSENTED' | 'EXECUTED' | 'REVOKED';
  consentGivenAt?: Date;
  expiresAt: Date;
  createdAt: Date;
}

const AIActionConsentSchema = new Schema<IAIActionConsent>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actionType: { type: String, required: true, enum: ['AUTO_BID_SETUP'] },
    listing: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
    maxAmountPaise: { type: Number, required: true },
    consentToken: { type: String, required: true, unique: true },
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'CONSENTED', 'EXECUTED', 'REVOKED'],
      default: 'PENDING',
    },
    consentGivenAt: { type: Date },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export const AIActionConsent = mongoose.model<IAIActionConsent>('AIActionConsent', AIActionConsentSchema);
