import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICartItem {
  categoryId: Types.ObjectId;
  price: number;
  originalPrice?: number;
  selectedDurationMonths?: number; // Selected time period duration (if category has time periods)
  addedAt: Date;
}

export interface ICart extends Document {
  userId: Types.ObjectId;
  items: ICartItem[];
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    selectedDurationMonths: { type: Number }, // Duration in months if time periods are available
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [CartItemSchema],
    totalAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

CartSchema.index({ userId: 1 });
CartSchema.index({ createdAt: -1 });

// Calculate total amount before saving
CartSchema.pre('save', function (next) {
  if (this.isModified('items')) {
    this.totalAmount = this.items.reduce((sum, item) => sum + item.price, 0);
  }
  next();
});

export const Cart = mongoose.model<ICart>('Cart', CartSchema);

