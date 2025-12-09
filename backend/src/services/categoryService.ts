import { Category } from '../models/Category';
import { Subscription } from '../models/Subscription';
import { TestSet } from '../models/TestSet';
import { TestAttempt } from '../models/TestAttempt';
import { User } from '../models/User';
import { Partner } from '../models/Partner';
import { Types } from 'mongoose';

// Helper function to calculate discounted price
function calculateDiscountedPrice(originalPrice: number, discountPercentage?: number): {
  originalPrice: number;
  discountedPrice: number;
  hasDiscount: boolean;
} {
  if (!discountPercentage || discountPercentage <= 0) {
    return {
      originalPrice,
      discountedPrice: originalPrice,
      hasDiscount: false,
    };
  }

  const discountAmount = (originalPrice * discountPercentage) / 100;
  const discountedPrice = Math.round(originalPrice - discountAmount);

  return {
    originalPrice,
    discountedPrice,
    hasDiscount: discountedPrice !== originalPrice,
  };
}

// Helper function to get user's discount percentage
async function getUserDiscountPercentage(userId?: string): Promise<number | undefined> {
  if (!userId) {
    return undefined;
  }

  const user = await User.findById(userId).populate('partnerId', 'discountPercentage isActive');
  if (!user || !user.partnerId) {
    return undefined;
  }

  const partner = user.partnerId as any;
  if (!partner.isActive) {
    return undefined;
  }

  return partner.discountPercentage;
}

export const categoryService = {
  async getAll(query: { page?: number; limit?: number; search?: string }, userId?: string) {
    const page = parseInt(query.page?.toString() || '1', 10);
    const limit = parseInt(query.limit?.toString() || '10', 10);
    const skip = (page - 1) * limit;

    const filter: any = { isActive: true };
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { description: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [categories, total] = await Promise.all([
      Category.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('-__v'),
      Category.countDocuments(filter),
    ]);

    // Get user's discount percentage if userId is provided
    const discountPercentage = await getUserDiscountPercentage(userId);

    // Calculate discounted prices for each category
    const categoriesWithPricing = categories.map((category) => {
      const pricing = calculateDiscountedPrice(category.price, discountPercentage);
      return {
        ...category.toObject(),
        originalPrice: pricing.originalPrice,
        discountedPrice: pricing.discountedPrice,
        hasDiscount: pricing.hasDiscount,
      };
    });

    return {
      categories: categoriesWithPricing,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  async getDetails(categoryId: string, userId?: string) {
    const category = await Category.findById(categoryId);
    if (!category) {
      throw new Error('Category not found');
    }

    // Get user's discount percentage if userId is provided
    const discountPercentage = await getUserDiscountPercentage(userId);
    const pricing = calculateDiscountedPrice(category.price, discountPercentage);

    const result: any = {
      category: {
        id: category._id,
        name: category.name,
        description: category.description,
        bannerImageUrl: category.bannerImageUrl,
        price: category.price,
        originalPrice: pricing.originalPrice,
        discountedPrice: pricing.discountedPrice,
        hasDiscount: pricing.hasDiscount,
        details: category.details,
        isActive: category.isActive,
        totalSetsCount: category.totalSetsCount,
      },
      subscriptionStatus: 'NONE',
    };

    if (userId) {
      const subscription = await Subscription.findOne({
        userId: new Types.ObjectId(userId),
        categoryId: new Types.ObjectId(categoryId),
      });

      if (subscription) {
        result.subscriptionStatus = subscription.status;
        result.subscription = {
          id: subscription._id,
          status: subscription.status,
          startsAt: subscription.startsAt,
          expiresAt: subscription.expiresAt,
        };

        if (subscription.status === 'APPROVED') {
          const sets = await TestSet.find({
            categoryId: new Types.ObjectId(categoryId),
            isActive: true,
          })
            .select('name _id durationMinutes totalMarks')
            .sort({ createdAt: 1 });

          const setsWithAttempts = await Promise.all(
            sets.map(async (set) => {
              const attempts = await TestAttempt.find({
                userId: new Types.ObjectId(userId),
                testSetId: set._id,
                status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
              })
                .sort({ createdAt: -1 })
                .limit(1)
                .select('totalScore totalCorrect totalWrong');

              return {
                id: set._id,
                name: set.name,
                durationMinutes: set.durationMinutes,
                totalMarks: set.totalMarks,
                lastAttempt: attempts[0] || null,
              };
            })
          );

          result.sets = setsWithAttempts;
        }
      }
    }

    return result;
  },
};

