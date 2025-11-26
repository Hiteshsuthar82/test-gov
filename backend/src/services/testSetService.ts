import { TestSet } from '../models/TestSet';
import { Question } from '../models/Question';
import { Subscription } from '../models/Subscription';
import { TestAttempt } from '../models/TestAttempt';
import { Types } from 'mongoose';

export const testSetService = {
  async getSetsByCategory(categoryId: string, userId: string) {
    // Check subscription
    const subscription = await Subscription.findOne({
      userId: new Types.ObjectId(userId),
      categoryId: new Types.ObjectId(categoryId),
      status: 'APPROVED',
    });

    if (!subscription) {
      throw new Error('Subscription not approved for this category');
    }

    const sets = await TestSet.find({
      categoryId: new Types.ObjectId(categoryId),
      isActive: true,
    })
      .sort({ createdAt: 1 })
      .select('-__v');

    return sets;
  },

  async getSetDetails(setId: string, userId: string) {
    const set = await TestSet.findById(setId).populate('categoryId', 'name');
    if (!set) {
      throw new Error('Test set not found');
    }

    // Check subscription
    const subscription = await Subscription.findOne({
      userId: new Types.ObjectId(userId),
      categoryId: set.categoryId,
      status: 'APPROVED',
    });

    if (!subscription) {
      throw new Error('Subscription not approved for this category');
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
};

