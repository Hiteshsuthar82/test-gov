import { Cart } from '../models/Cart';
import { Category } from '../models/Category';
import { Types } from 'mongoose';

export const cartService = {
  async getCart(userId: string) {
    let cart = await Cart.findOne({ userId: new Types.ObjectId(userId) })
      .populate('items.categoryId', 'name price originalPrice timePeriods bannerImageUrl');
    
    if (!cart) {
      cart = await Cart.create({
        userId: new Types.ObjectId(userId),
        items: [],
        totalAmount: 0,
      });
    }
    
    return cart;
  },

  async addItem(userId: string, categoryId: string, selectedDurationMonths?: number) {
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

    // Determine price and originalPrice based on time periods
    let itemPrice = category.price || 0;
    let itemOriginalPrice = category.originalPrice || category.price || 0;
    let selectedDuration = selectedDurationMonths;

    if (category.timePeriods && category.timePeriods.length > 0) {
      // If time periods exist
      if (selectedDurationMonths) {
        // Find the selected time period
        const selectedPeriod = category.timePeriods.find(tp => tp.months === selectedDurationMonths);
        if (selectedPeriod) {
          itemPrice = selectedPeriod.price;
          itemOriginalPrice = selectedPeriod.originalPrice;
        } else {
          // If selected duration not found, use the first/cheapest period
          const defaultPeriod = category.timePeriods[0];
          itemPrice = defaultPeriod.price;
          itemOriginalPrice = defaultPeriod.originalPrice;
          selectedDuration = defaultPeriod.months;
        }
      } else {
        // No duration selected, use the first/cheapest period as default
        const defaultPeriod = category.timePeriods[0];
        itemPrice = defaultPeriod.price;
        itemOriginalPrice = defaultPeriod.originalPrice;
        selectedDuration = defaultPeriod.months;
      }
    }

    // Price will be calculated with user discount in controller if applicable

    cart.items.push({
      categoryId: new Types.ObjectId(categoryId),
      price: itemPrice,
      originalPrice: itemOriginalPrice,
      selectedDurationMonths: selectedDuration,
      addedAt: new Date(),
    });

    await cart.save();
    return await Cart.findById(cart._id).populate('items.categoryId', 'name price originalPrice timePeriods bannerImageUrl');
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
    return await Cart.findById(cart._id).populate('items.categoryId', 'name price originalPrice timePeriods bannerImageUrl');
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

    return await Cart.findById(cart._id).populate('items.categoryId', 'name price originalPrice timePeriods bannerImageUrl');
  },

  async updateItemDuration(userId: string, categoryId: string, newDurationMonths: number) {
    const cart = await Cart.findOne({ userId: new Types.ObjectId(userId) });
    if (!cart) {
      throw new Error('Cart not found');
    }

    const item = cart.items.find(
      (item) => item.categoryId.toString() === categoryId
    );

    if (!item) {
      throw new Error('Item not found in cart');
    }

    const category = await Category.findById(item.categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    if (!category.timePeriods || category.timePeriods.length === 0) {
      throw new Error('This category does not support dynamic durations');
    }

    const selectedPeriod = category.timePeriods.find(tp => tp.months === newDurationMonths);
    if (!selectedPeriod) {
      throw new Error('Invalid duration selected');
    }

    item.selectedDurationMonths = newDurationMonths;
    item.price = selectedPeriod.price;
    item.originalPrice = selectedPeriod.originalPrice;

    await cart.save();
    return await Cart.findById(cart._id).populate('items.categoryId', 'name price originalPrice timePeriods bannerImageUrl');
  },
};

