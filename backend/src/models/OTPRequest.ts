import mongoose, { Schema, Document } from 'mongoose';

export interface IOTPRequest extends Document {
  email: string;
  otp: string; // hashed
  expiresAt: Date;
  isUsed: boolean;
  createdAt: Date;
}

const OTPRequestSchema = new Schema<IOTPRequest>(
  {
    email: { type: String, required: true, lowercase: true },
    otp: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

OTPRequestSchema.index({ email: 1, expiresAt: 1 });
OTPRequestSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 }); // Auto-delete after 10 min

export const OTPRequest = mongoose.model<IOTPRequest>('OTPRequest', OTPRequestSchema);

