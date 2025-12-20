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
        .select('-__v')
        .lean(),
      Category.countDocuments(filter),
    ]);

    if (categories.length === 0) {
      return {
        categories: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
        },
      };
    }

    // Get user's discount percentage if userId is provided
    const discountPercentage = await getUserDiscountPercentage(userId);

    // Batch fetch all statistics in parallel
    const categoryIds = categories.map(cat => cat._id);

    // Batch fetch user counts for all categories
    const userCountsAggregation = await Subscription.aggregate([
      {
        $match: {
          categoryId: { $in: categoryIds },
          status: 'APPROVED',
        },
      },
      {
        $group: {
          _id: '$categoryId',
          count: { $sum: 1 },
        },
      },
    ]);
    const userCountsMap = new Map(
      userCountsAggregation.map(item => [item._id.toString(), item.count])
    );

    // Batch fetch all test sets for all categories
    const allTestSets = await TestSet.find({
      categoryId: { $in: categoryIds },
      isActive: true,
    })
      .select('_id categoryId')
      .lean();

    // Group test sets by category
    const testSetsByCategory = new Map<string, Types.ObjectId[]>();
    allTestSets.forEach(ts => {
      const catId = ts.categoryId.toString();
      if (!testSetsByCategory.has(catId)) {
        testSetsByCategory.set(catId, []);
      }
      testSetsByCategory.get(catId)!.push(ts._id);
    });

    // Batch fetch completed sets count for user (if userId provided)
    const completedSetsMap = new Map<string, number>();
    if (userId) {
      const allTestSetIds = allTestSets.map(ts => ts._id);
      if (allTestSetIds.length > 0) {
        const completedAttempts = await TestAttempt.aggregate([
          {
            $match: {
              userId: new Types.ObjectId(userId),
              testSetId: { $in: allTestSetIds },
              status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
            },
          },
          {
            $group: {
              _id: '$testSetId',
            },
          },
        ]);

        const completedTestSetIds = new Set(
          completedAttempts.map(a => a._id.toString())
        );

        // Count completed sets per category
        allTestSets.forEach(ts => {
          const catId = ts.categoryId.toString();
          if (completedTestSetIds.has(ts._id.toString())) {
            completedSetsMap.set(
              catId,
              (completedSetsMap.get(catId) || 0) + 1
            );
          }
        });
      }
    }

    // Batch fetch languages for all categories using aggregation
    const allTestSetIds = allTestSets.map(ts => ts._id);
    const languagesByCategory = new Map<string, Set<string>>();
    
    if (allTestSetIds.length > 0) {
      const languagesAggregation = await Question.aggregate([
        {
          $match: {
            testSetId: { $in: allTestSetIds },
            isActive: true,
          },
        },
        {
          $group: {
            _id: '$testSetId',
            languages: { $first: '$languages' },
          },
        },
      ]);

      // Map test set IDs to category IDs
      const testSetToCategory = new Map<string, string>();
      allTestSets.forEach(ts => {
        testSetToCategory.set(ts._id.toString(), ts.categoryId.toString());
      });

      // Aggregate languages by category
      languagesAggregation.forEach(item => {
        const catId = testSetToCategory.get(item._id.toString());
        if (catId && item.languages) {
          if (!languagesByCategory.has(catId)) {
            languagesByCategory.set(catId, new Set());
          }
          const langSet = languagesByCategory.get(catId)!;
          if (item.languages.en) langSet.add('en');
          if (item.languages.hi) langSet.add('hi');
          if (item.languages.gu) langSet.add('gu');
        }
      });
    }

    // Build response with all pre-fetched data
    const categoriesWithStats = categories.map((category) => {
      const pricing = calculateDiscountedPrice(category.price, discountPercentage);
      const categoryIdStr = category._id.toString();
      
      const userCount = userCountsMap.get(categoryIdStr) || 0;
      const totalTests = category.totalSetsCount || 0;
      const freeTests = category.price === 0 ? totalTests : 0;

      // Get languages for this category
      const availableLanguages = languagesByCategory.get(categoryIdStr) || new Set();
      const languagesArray: string[] = [];
      if (availableLanguages.has('en')) languagesArray.push('English');
      if (availableLanguages.has('hi')) languagesArray.push('Hindi');
      if (availableLanguages.has('gu')) languagesArray.push('Gujarati');
      
      let languagesDisplay: string | string[];
      if (languagesArray.length > 2) {
        languagesDisplay = [languagesArray[0], languagesArray[1], `+ ${languagesArray.length - 2} More`];
      } else {
        languagesDisplay = languagesArray;
      }

      const completedSetsCount = completedSetsMap.get(categoryIdStr) || 0;

      return {
        ...category,
        originalPrice: pricing.originalPrice,
        discountedPrice: pricing.discountedPrice,
        hasDiscount: pricing.hasDiscount,
        userCount,
        totalTests,
        freeTests,
        languages: languagesDisplay,
        completedSetsCount,
      };
    });

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
    const category = await Category.findById(categoryId).lean();
    if (!category) {
      throw new Error('Category not found');
    }

    // Parallel fetch all data
    const [
      discountPercentage,
      userCount,
      testSetIds,
      subscription
    ] = await Promise.all([
      getUserDiscountPercentage(userId),
      Subscription.countDocuments({
        categoryId: category._id,
        status: 'APPROVED',
      }),
      TestSet.find({
        categoryId: category._id,
        isActive: true,
      }).select('_id').lean(),
      userId ? Subscription.findOne({
        userId: new Types.ObjectId(userId),
        categoryId: new Types.ObjectId(categoryId),
      }).lean() : Promise.resolve(null),
    ]);

    const pricing = calculateDiscountedPrice(category.price, discountPercentage);
    const totalTests = category.totalSetsCount || 0;
    const freeTests = category.price === 0 ? totalTests : 0;

    // Optimize language query using aggregation
    const availableLanguages = new Set<string>();
    if (testSetIds.length > 0) {
      const testSetObjectIds = testSetIds.map(ts => ts._id);
      const languagesAggregation = await Question.aggregate([
        {
          $match: {
            testSetId: { $in: testSetObjectIds },
            isActive: true,
          },
        },
        {
          $group: {
            _id: '$testSetId',
            languages: { $first: '$languages' },
          },
        },
      ]);

      languagesAggregation.forEach((item: any) => {
        if (item.languages) {
          if (item.languages.en) availableLanguages.add('en');
          if (item.languages.hi) availableLanguages.add('hi');
          if (item.languages.gu) availableLanguages.add('gu');
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

    if (subscription) {
      result.subscriptionStatus = subscription.status;
      result.subscription = {
        id: subscription._id,
        status: subscription.status,
        startsAt: subscription.startsAt,
        expiresAt: subscription.expiresAt,
      };

      // Only fetch sets if subscription is approved (lazy load)
      if (subscription.status === 'APPROVED' && userId) {
        const sets = await TestSet.find({
          categoryId: new Types.ObjectId(categoryId),
          isActive: true,
        })
          .select('name _id durationMinutes totalMarks')
          .sort({ createdAt: 1 })
          .lean();

        if (sets.length > 0) {
          const setIds = sets.map(s => s._id);
          // Batch fetch all attempts in one query
          const allAttempts = await TestAttempt.find({
            userId: new Types.ObjectId(userId),
            testSetId: { $in: setIds },
            status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
          })
            .sort({ testSetId: 1, createdAt: -1 })
            .select('testSetId totalScore totalCorrect totalWrong')
            .lean();

          // Group attempts by testSetId and get the latest one
          const attemptsBySet = new Map<string, any>();
          allAttempts.forEach(attempt => {
            const setId = attempt.testSetId.toString();
            if (!attemptsBySet.has(setId)) {
              attemptsBySet.set(setId, attempt);
            }
          });

          result.sets = sets.map(set => ({
            id: set._id,
            name: set.name,
            durationMinutes: set.durationMinutes,
            totalMarks: set.totalMarks,
            lastAttempt: attemptsBySet.get(set._id.toString()) || null,
          }));
        } else {
          result.sets = [];
        }
      }
    }

    return result;
  },
};

