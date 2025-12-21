import { Cart } from '../models/Cart';
import { User } from '../models/User';
import { Types } from 'mongoose';

export const adminCartService = {
  async getAll(query: {
    userId?: string;
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const page = parseInt(query.page?.toString() || '1', 10);
    const limit = parseInt(query.limit?.toString() || '20', 10);
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (query.userId) {
      filter.userId = new Types.ObjectId(query.userId);
    }

    // Date filters
    if (query.dateFrom || query.dateTo) {
      filter.createdAt = {};
      if (query.dateFrom) {
        filter.createdAt.$gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        filter.createdAt.$lte = new Date(query.dateTo);
      }
    }

    const [carts, total] = await Promise.all([
      Cart.find(filter)
        .populate('userId', 'name email mobile')
        .populate('items.categoryId', 'name price bannerImageUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Cart.countDocuments(filter),
    ]);

    return {
      carts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  async getById(id: string) {
    const cart = await Cart.findById(id)
      .populate('userId', 'name email mobile')
      .populate('items.categoryId', 'name price bannerImageUrl');
    if (!cart) {
      throw new Error('Cart not found');
    }
    return cart;
  },

  async getByUserId(userId: string) {
    const cart = await Cart.findOne({ userId: new Types.ObjectId(userId) })
      .populate('userId', 'name email mobile')
      .populate('items.categoryId', 'name price bannerImageUrl');
    return cart;
  },
};

