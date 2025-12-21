import { TestSet } from '../models/TestSet';
import { Question } from '../models/Question';
import { Subscription } from '../models/Subscription';
import { TestAttempt } from '../models/TestAttempt';
import { Types } from 'mongoose';

export const testSetService = {
  async getSetsByCategory(
    categoryId: string, 
    userId: string,
    options?: {
      page?: number;
      limit?: number;
      sectionId?: string;
      subsectionId?: string;
    }
  ) {
    // Check subscription - but allow free tests even without subscription
    const subscription = await Subscription.findOne({
      userId: new Types.ObjectId(userId),
      categoryId: new Types.ObjectId(categoryId),
      status: 'APPROVED',
    }).lean();

    // If no subscription, we'll filter to only show free tests
    const hasSubscription = !!subscription;

    // Build filter
    const filter: any = {
      categoryId: new Types.ObjectId(categoryId),
      isActive: true,
    };

    // If no subscription, only show free tests
    if (!hasSubscription) {
      filter.isFree = true;
    }

    if (options?.sectionId) {
      filter.sectionId = options.sectionId;
    }

    if (options?.subsectionId) {
      filter.subsectionId = options.subsectionId;
    }

    // Pagination
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    // Get sets with pagination
    const [sets, total] = await Promise.all([
      TestSet.find(filter)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .select('-__v')
        .lean(),
      TestSet.countDocuments(filter),
    ]);

    if (sets.length === 0) {
      return {
        sets: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
        },
      };
    }

    // Batch fetch question counts for all sets
    const setIds = sets.map(s => s._id);
    const questionCountsAggregation = await Question.aggregate([
      {
        $match: {
          testSetId: { $in: setIds },
          isActive: true,
        },
      },
      {
        $group: {
          _id: '$testSetId',
          count: { $sum: 1 },
        },
      },
    ]);
    const questionCountsMap = new Map(
      questionCountsAggregation.map(item => [item._id.toString(), item.count])
    );

    // Batch fetch attempt counts for all sets
    const attemptCountsAggregation = await TestAttempt.aggregate([
      {
        $match: {
          userId: new Types.ObjectId(userId),
          testSetId: { $in: setIds },
          status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
        },
      },
      {
        $group: {
          _id: '$testSetId',
          count: { $sum: 1 },
        },
      },
    ]);
    const attemptCountsMap = new Map(
      attemptCountsAggregation.map(item => [item._id.toString(), item.count])
    );

    // Map counts to sets
    const setsWithCounts = sets.map((set) => ({
      ...set,
      totalQuestions: questionCountsMap.get(set._id.toString()) || 0,
      attemptCount: attemptCountsMap.get(set._id.toString()) || 0,
      isFree: set.isFree || false,
    }));

    return {
      sets: setsWithCounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  async getSetDetails(setId: string, userId: string) {
    const set = await TestSet.findById(setId).populate('categoryId', 'name');
    if (!set) {
      throw new Error('Test set not found');
    }

    // Check subscription - only required if test is not free
    if (!set.isFree) {
      const subscription = await Subscription.findOne({
        userId: new Types.ObjectId(userId),
        categoryId: set.categoryId,
        status: 'APPROVED',
      });

      if (!subscription) {
        throw new Error('Subscription not approved for this category');
      }
    }

    // Get attempt stats
    const attempts = await TestAttempt.find({
      userId: new Types.ObjectId(userId),
      testSetId: new Types.ObjectId(setId),
      status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
    })
      .sort({ createdAt: -1 })
      .select('totalScore totalCorrect totalWrong totalUnanswered createdAt');

    const totalAttempts = attempts.length;
    const lastScore = attempts[0]?.totalScore || 0;
    const bestScore = attempts.length > 0
      ? Math.max(...attempts.map((a) => a.totalScore))
      : 0;

    return {
      set: {
        id: set._id,
        name: set.name,
        description: set.description,
        durationMinutes: set.durationMinutes,
        totalMarks: set.totalMarks,
        negativeMarking: set.negativeMarking,
        sections: set.sections,
        categoryId: set.categoryId,
        isFree: set.isFree || false,
      },
      stats: {
        totalAttempts,
        lastScore,
        bestScore,
      },
    };
  },

  async getUserAttempts(setId: string, userId: string) {
    const attempts = await TestAttempt.find({
      userId: new Types.ObjectId(userId),
      testSetId: new Types.ObjectId(setId),
    })
      .sort({ createdAt: -1 })
      .select('-questions -__v');

    return attempts;
  },

  async getSetsByCategoryPublic(
    categoryId: string, 
    userId?: string,
    options?: {
      page?: number;
      limit?: number;
      sectionId?: string;
      subsectionId?: string;
    }
  ) {
    // Build filter
    const filter: any = {
      categoryId: new Types.ObjectId(categoryId),
      isActive: true,
    };

    if (options?.sectionId) {
      filter.sectionId = options.sectionId;
    }

    if (options?.subsectionId) {
      filter.subsectionId = options.subsectionId;
    }

    // Pagination
    const page = options?.page || 1;
    const limit = options?.limit || 20;
    const skip = (page - 1) * limit;

    // Get sets with pagination
    const [sets, total] = await Promise.all([
      TestSet.find(filter)
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .select('name description durationMinutes totalMarks isActive isFree _id categoryId sectionId subsectionId')
        .lean(),
      TestSet.countDocuments(filter),
    ]);

    if (sets.length === 0) {
      return {
        sets: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0,
        },
      };
    }

    // Batch fetch question counts for all sets
    const setIds = sets.map(s => s._id);
    const questionCountsAggregation = await Question.aggregate([
      {
        $match: {
          testSetId: { $in: setIds },
          isActive: true,
        },
      },
      {
        $group: {
          _id: '$testSetId',
          count: { $sum: 1 },
        },
      },
    ]);
    const questionCountsMap = new Map(
      questionCountsAggregation.map(item => [item._id.toString(), item.count])
    );

    // Batch fetch attempt counts if userId is provided
    const attemptCountsMap = new Map<string, number>();
    if (userId && setIds.length > 0) {
      const attemptCountsAggregation = await TestAttempt.aggregate([
        {
          $match: {
            userId: new Types.ObjectId(userId),
            testSetId: { $in: setIds },
            status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
          },
        },
        {
          $group: {
            _id: '$testSetId',
            count: { $sum: 1 },
          },
        },
      ]);
      attemptCountsAggregation.forEach(item => {
        attemptCountsMap.set(item._id.toString(), item.count);
      });
    }

    // Map counts to sets
    const setsWithCounts = sets.map((set) => ({
      _id: set._id,
      name: set.name,
      description: set.description,
      durationMinutes: set.durationMinutes,
      totalMarks: set.totalMarks,
      totalQuestions: questionCountsMap.get(set._id.toString()) || 0,
      attemptCount: attemptCountsMap.get(set._id.toString()) || 0,
      categoryId: set.categoryId,
      isActive: set.isActive,
      isFree: set.isFree || false,
      sectionId: set.sectionId,
      subsectionId: set.subsectionId,
    }));

    return {
      sets: setsWithCounts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },
};

