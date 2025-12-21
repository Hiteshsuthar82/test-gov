import { Cart } from '../models/Cart';
import { Category } from '../models/Category';
import { Types } from 'mongoose';

export const cartService = {
  async getCart(userId: string) {
    let cart = await Cart.findOne({ userId: new Types.ObjectId(userId) })
      .populate('items.categoryId', 'name price bannerImageUrl');
    
    if (!cart) {
      cart = await Cart.create({
        userId: new Types.ObjectId(userId),
        items: [],
        totalAmount: 0,
      });
    }
    
    return cart;
  },

  async addItem(userId: string, categoryId: string) {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    let cart = await Cart.findOne({ userId: new Types.ObjectId(userId) });
    
    if (!cart) {
      cart = await Cart.create({
        userId: new Types.ObjectId(userId),
        items: [],
        totalAmount: 0,
      });
    }

    // Check if category already in cart
    const existingItemIndex = cart.items.findIndex(
      (item) => item.categoryId.toString() === categoryId
    );

    if (existingItemIndex >= 0) {
      throw new Error('Category already in cart');
    }

    // Get user discount if applicable
    const discountedPrice = category.price || 0; // Will be calculated with discount in controller

    cart.items.push({
      categoryId: new Types.ObjectId(categoryId),
      price: discountedPrice,
      originalPrice: category.price,
      addedAt: new Date(),
    });

    await cart.save();
    return await Cart.findById(cart._id).populate('items.categoryId', 'name price bannerImageUrl');
  },

  async removeItem(userId: string, categoryId: string) {
    const cart = await Cart.findOne({ userId: new Types.ObjectId(userId) });
    if (!cart) {
      throw new Error('Cart not found');
    }

    cart.items = cart.items.filter(
      (item) => item.categoryId.toString() !== categoryId
    );

    await cart.save();
    return await Cart.findById(cart._id).populate('items.categoryId', 'name price bannerImageUrl');
  },

  async clearCart(userId: string) {
    const cart = await Cart.findOne({ userId: new Types.ObjectId(userId) });
    if (!cart) {
      return null;
    }

    cart.items = [];
    await cart.save();
    return cart;
  },

  async updateItemPrice(userId: string, categoryId: string, price: number) {
    const cart = await Cart.findOne({ userId: new Types.ObjectId(userId) });
    if (!cart) {
      throw new Error('Cart not found');
    }

    const item = cart.items.find(
      (item) => item.categoryId.toString() === categoryId
    );

    if (item) {
      item.price = price;
      await cart.save();
    }

    return await Cart.findById(cart._id).populate('items.categoryId', 'name price bannerImageUrl');
  },
};

