import { Response } from 'express';
import { cartService } from '../services/cartService';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { categoryService } from '../services/categoryService';

export const cartController = {
  getCart: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user._id.toString();
      const cart = await cartService.getCart(userId);
      
      // Calculate discounted prices for each item
      const itemsWithDiscount = await Promise.all(
        cart.items.map(async (item: any) => {
          const categoryId = item.categoryId._id?.toString() || item.categoryId.toString();
          const categoryDetails = await categoryService.getDetails(categoryId, userId);
          return {
            ...item.toObject(),
            categoryId: {
              _id: categoryId,
              name: item.categoryId.name,
              price: item.categoryId.price,
              bannerImageUrl: item.categoryId.bannerImageUrl,
            },
            discountedPrice: categoryDetails?.category?.discountedPrice || item.price,
            originalPrice: categoryDetails?.category?.price || item.originalPrice,
          };
        })
      );

      // Recalculate total with discounts
      const totalAmount = itemsWithDiscount.reduce((sum, item) => sum + (item.discountedPrice || item.price), 0);

      sendSuccess(res, {
        ...cart.toObject(),
        items: itemsWithDiscount,
        totalAmount,
      });
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  addItem: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user._id.toString();
      const { categoryId } = req.body;

      if (!categoryId) {
        return sendError(res, 'Category ID is required', 400);
      }

      const cart = await cartService.addItem(userId, categoryId);
      
      // Calculate discounted price
      const categoryDetails = await categoryService.getDetails(categoryId, userId);
      const discountedPrice = categoryDetails?.category?.discountedPrice || categoryDetails?.category?.price || 0;
      
      // Update item price with discount
      await cartService.updateItemPrice(userId, categoryId, discountedPrice);
      const updatedCart = await cartService.getCart(userId);

      sendSuccess(res, updatedCart, 'Item added to cart');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  removeItem: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user._id.toString();
      const { categoryId } = req.params;

      const cart = await cartService.removeItem(userId, categoryId);
      sendSuccess(res, cart, 'Item removed from cart');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },

  clearCart: async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user._id.toString();
      const cart = await cartService.clearCart(userId);
      sendSuccess(res, cart, 'Cart cleared');
    } catch (error: any) {
      sendError(res, error.message, 400);
    }
  },
};

