import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  mobile: string;
  preparingForExam?: string;
  deviceId?: string;
  fcmToken?: string;
  partnerId?: mongoose.Types.ObjectId;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    mobile: { type: String, required: true },
    preparingForExam: { type: String },
    deviceId: { type: String },
    fcmToken: { type: String },
    partnerId: { type: Schema.Types.ObjectId, ref: 'Partner' },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1 });
UserSchema.index({ deviceId: 1 });
UserSchema.index({ partnerId: 1 });

export const User = mongoose.model<IUser>('User', UserSchema);

