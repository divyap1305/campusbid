import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAuditLog extends Document {
  event: string;
  entityType: 'LISTING' | 'BID' | 'AUTO_BID' | 'HANDOVER' | 'USER';
  entityId: Types.ObjectId;
  actorId?: Types.ObjectId;
  details: Record<string, any>;
  ipAddress?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    event: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: 'User' },
    details: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ entityType: 1, entityId: 1 });
AuditLogSchema.index({ createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
