import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INotification extends Document {
  title: string;
  message: string;
  type: 'general' | 'category' | 'testSet' | 'notice' | 'payment_approved' | 'payment_rejected';
  categoryId?: Types.ObjectId;
  testSetId?: Types.ObjectId;
  userId?: Types.ObjectId;
  target: 'ALL' | 'CATEGORY_USERS' | 'USER';
  sentTo: Types.ObjectId[];
  createdByAdminId: Types.ObjectId;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['general', 'category', 'testSet', 'notice', 'payment_approved' , 'payment_rejected'],
      required: true,
    },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category' },
    testSetId: { type: Schema.Types.ObjectId, ref: 'TestSet' },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    target: {
      type: String,
      enum: ['ALL', 'CATEGORY_USERS', 'USER'],
      required: true,
    },
    sentTo: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    createdByAdminId: { type: Schema.Types.ObjectId, ref: 'AdminUser', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

NotificationSchema.index({ target: 1, categoryId: 1 });
NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ createdAt: -1 });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

