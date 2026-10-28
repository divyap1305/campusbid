import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ISavedSearch extends Document {
  user: Types.ObjectId;
  query?: string;
  category?: string;
  maxPricePaise?: number;
  condition?: string;
  isActive: boolean;
  lastNotifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SavedSearchSchema = new Schema<ISavedSearch>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    query: { type: String, trim: true },
    category: { type: String, trim: true },
    maxPricePaise: { type: Number },
    condition: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    lastNotifiedAt: { type: Date },
  },
  { timestamps: true }
);

export const SavedSearch = mongoose.model<ISavedSearch>('SavedSearch', SavedSearchSchema);
