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

    // Get question counts and attempt counts for each set
    const setsWithCounts = await Promise.all(
      sets.map(async (set) => {
        // Use set._id directly - Mongoose handles ObjectId comparison automatically
        const questionCount = await Question.countDocuments({
          testSetId: set._id,
          isActive: true,
        });

        // Get attempt count for this user and test set
        const attemptCount = await TestAttempt.countDocuments({
          userId: new Types.ObjectId(userId),
          testSetId: set._id,
          status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
        });

        return {
          ...set.toObject(),
          totalQuestions: questionCount,
          attemptCount: attemptCount,
          sectionId: set.sectionId,
          subsectionId: set.subsectionId,
        };
      })
    );

    return setsWithCounts;
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

  async getSetsByCategoryPublic(categoryId: string, userId?: string) {
    // Get test sets without subscription check (public info only)
    const sets = await TestSet.find({
      categoryId: new Types.ObjectId(categoryId),
      isActive: true,
    })
      .sort({ createdAt: 1 })
      .select('name description durationMinutes totalMarks isActive _id categoryId sectionId subsectionId');

    // Get question counts and attempt counts for each set
    const setsWithCounts = await Promise.all(
      sets.map(async (set) => {
        // Use set._id directly - Mongoose handles ObjectId comparison automatically
        const questionCount = await Question.countDocuments({
          testSetId: set._id,
          isActive: true,
        });

        let attemptCount = 0;
        // Get attempt count if userId is provided
        if (userId) {
          attemptCount = await TestAttempt.countDocuments({
            userId: new Types.ObjectId(userId),
            testSetId: set._id,
            status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
          });
        }

        return {
          _id: set._id,
          name: set.name,
          description: set.description,
          durationMinutes: set.durationMinutes,
          totalMarks: set.totalMarks,
          totalQuestions: questionCount,
          attemptCount: attemptCount,
          categoryId: set.categoryId,
          isActive: set.isActive,
          sectionId: set.sectionId,
          subsectionId: set.subsectionId,
        };
      })
    );

    return setsWithCounts;
  },
};

