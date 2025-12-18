import { Category } from '../models/Category';
import { Subscription } from '../models/Subscription';
import { TestSet } from '../models/TestSet';
import { TestAttempt } from '../models/TestAttempt';
import { Question } from '../models/Question';
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

    // Get additional statistics for each category
    const categoriesWithStats = await Promise.all(
      categories.map(async (category) => {
        const pricing = calculateDiscountedPrice(category.price, discountPercentage);
        
        // Get user count (approved subscriptions for this category)
        const userCount = await Subscription.countDocuments({
          categoryId: category._id,
          status: 'APPROVED',
        });

        // Get total tests (already available as totalSetsCount)
        const totalTests = category.totalSetsCount || 0;

        // Get free tests count (if category price is 0, all tests are free; otherwise 0)
        // Or we can count test sets that are marked as free if we add that field later
        const freeTests = category.price === 0 ? totalTests : 0;

        // Get available languages from questions in test sets of this category
        const testSetIds = await TestSet.find({
          categoryId: category._id,
          isActive: true,
        }).select('_id').lean();

        const testSetObjectIds = testSetIds.map(ts => ts._id);
        
        const availableLanguages = new Set<string>();
        if (testSetObjectIds.length > 0) {
          const questions = await Question.find({
            testSetId: { $in: testSetObjectIds },
            isActive: true,
          }).select('languages').lean();

          questions.forEach((question: any) => {
            if (question.languages) {
              if (question.languages.en) availableLanguages.add('en');
              if (question.languages.hi) availableLanguages.add('hi');
              if (question.languages.gu) availableLanguages.add('gu');
            }
          });
        }

        // Format languages array
        const languagesArray: string[] = [];
        if (availableLanguages.has('en')) languagesArray.push('English');
        if (availableLanguages.has('hi')) languagesArray.push('Hindi');
        if (availableLanguages.has('gu')) languagesArray.push('Gujarati');
        
        // If more than 2 languages, show first 2 + "X More"
        let languagesDisplay: string | string[];
        if (languagesArray.length > 2) {
          languagesDisplay = [languagesArray[0], languagesArray[1], `+ ${languagesArray.length - 2} More`];
        } else {
          languagesDisplay = languagesArray;
        }

        // Get completed sets count for the user (if userId provided)
        let completedSetsCount = 0;
        if (userId && totalTests > 0) {
          // Get all test sets for this category
          const categoryTestSets = await TestSet.find({
            categoryId: category._id,
            isActive: true,
          }).select('_id').lean();

          const testSetIds = categoryTestSets.map(ts => ts._id);
          
          if (testSetIds.length > 0) {
            // Count distinct test sets that user has completed (submitted attempts)
            const completedSets = await TestAttempt.distinct('testSetId', {
              userId: new Types.ObjectId(userId),
              testSetId: { $in: testSetIds },
              status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
            });
            completedSetsCount = completedSets.length;
          }
        }

        return {
          ...category.toObject(),
          originalPrice: pricing.originalPrice,
          discountedPrice: pricing.discountedPrice,
          hasDiscount: pricing.hasDiscount,
          userCount,
          totalTests,
          freeTests,
          languages: languagesDisplay,
          completedSetsCount,
        };
      })
    );

    return {
      categories: categoriesWithStats,
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

    // Get user count (approved subscriptions for this category)
    const userCount = await Subscription.countDocuments({
      categoryId: category._id,
      status: 'APPROVED',
    });

    // Get total tests
    const totalTests = category.totalSetsCount || 0;

    // Get free tests count
    const freeTests = category.price === 0 ? totalTests : 0;

    // Get available languages from questions in test sets of this category
    const testSetIds = await TestSet.find({
      categoryId: category._id,
      isActive: true,
    }).select('_id').lean();

    const testSetObjectIds = testSetIds.map(ts => ts._id);
    
    const availableLanguages = new Set<string>();
    if (testSetObjectIds.length > 0) {
      const questions = await Question.find({
        testSetId: { $in: testSetObjectIds },
        isActive: true,
      }).select('languages').lean();

      questions.forEach((question: any) => {
        if (question.languages) {
          if (question.languages.en) availableLanguages.add('en');
          if (question.languages.hi) availableLanguages.add('hi');
          if (question.languages.gu) availableLanguages.add('gu');
        }
      });
    }

    // Format languages array
    const languagesArray: string[] = [];
    if (availableLanguages.has('en')) languagesArray.push('English');
    if (availableLanguages.has('hi')) languagesArray.push('Hindi');
    if (availableLanguages.has('gu')) languagesArray.push('Gujarati');

    const result: any = {
      category: {
        id: category._id,
        name: category.name,
        description: category.description,
        descriptionFormatted: category.descriptionFormatted,
        bannerImageUrl: category.bannerImageUrl,
        price: category.price,
        originalPrice: pricing.originalPrice,
        discountedPrice: pricing.discountedPrice,
        hasDiscount: pricing.hasDiscount,
        details: category.details,
        detailsFormatted: category.detailsFormatted,
        isActive: category.isActive,
        totalSetsCount: category.totalSetsCount,
        totalTests,
        sections: category.sections || [],
        updatedAt: category.updatedAt,
        userCount,
        freeTests,
        languages: languagesArray,
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

