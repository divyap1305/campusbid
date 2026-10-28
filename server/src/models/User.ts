import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  studentId: string;
  department: string;
  phoneNumber?: string;
  role: 'STUDENT' | 'ADMIN';
  avatarUrl?: string;
  isCampusVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    studentId: { type: String, required: true, trim: true },
    department: { type: String, required: true, default: 'General' },
    phoneNumber: { type: String, trim: true },
    role: { type: String, enum: ['STUDENT', 'ADMIN'], default: 'STUDENT' },
    avatarUrl: { type: String },
    isCampusVerified: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', UserSchema);
