import mongoose, { Schema, Document, Types } from 'mongoose';

export type NotificationType =
  | 'OUTBID'
  | 'AUCTION_WON'
  | 'SELLER_DECISION_NEEDED'
  | 'SELLER_APPROVED'
  | 'SELLER_REJECTED'
  | 'ITEM_RESERVED'
  | 'HANDOVER_CONFIRMED'
  | 'HANDOVER_FAILED'
  | 'QUESTION_ASKED'
  | 'QUESTION_ANSWERED'
  | 'SAVED_SEARCH_MATCH'
  | 'WATCHLIST_PRICE_UPDATE'
  | 'AUCTION_CLOSING_SOON';

export interface INotification extends Document {
  recipient: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, required: true },
    isRead: { type: Boolean, default: false, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ recipient: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
