import { Leaderboard } from '../models/Leaderboard';
import { Types } from 'mongoose';

export const adminLeaderboardService = {
  async getAll(query: {
    categoryId?: string;
    testSetId?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = parseInt(query.page?.toString() || '1', 10);
    const limit = parseInt(query.limit?.toString() || '20', 10);
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (query.categoryId) {
      filter.categoryId = new Types.ObjectId(query.categoryId);
    }
    if (query.testSetId) {
      filter.testSetId = new Types.ObjectId(query.testSetId);
    }

    // Search by user name or email
    let userIds: Types.ObjectId[] | undefined;
    if (query.search) {
      const { User } = require('../models/User');
      const users = await User.find({
        $or: [
          { name: { $regex: query.search, $options: 'i' } },
          { email: { $regex: query.search, $options: 'i' } },
        ],
      }).select('_id');
      userIds = users.map((u: any) => u._id);
      if (userIds.length === 0) {
        // No users found, return empty result
        return {
          leaderboard: [],
          pagination: {
            page,
            limit,
            total: 0,
            pages: 0,
          },
        };
      }
      filter.userId = { $in: userIds };
    }

    const [leaderboardEntries, total] = await Promise.all([
      Leaderboard.find(filter)
        .populate('userId', 'name email mobile')
        .populate('categoryId', 'name')
        .populate('testSetId', 'name')
        .populate('bestAttemptId', 'totalTimeSeconds totalCorrect totalWrong')
        .sort({ rank: 1 })
        .skip(skip)
        .limit(limit),
      Leaderboard.countDocuments(filter),
    ]);

    return {
      leaderboard: leaderboardEntries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },

  async recalculateRanks(categoryId: string, testSetId?: string) {
    const filter: any = { categoryId: new Types.ObjectId(categoryId) };
    if (testSetId) {
      filter.testSetId = new Types.ObjectId(testSetId);
    }

    const allEntries = await Leaderboard.find(filter)
      .populate('bestAttemptId', 'totalTimeSeconds')
      .sort({ bestScore: -1 })
      .exec();

    // Sort by score first, then by time (faster time = better rank for same score)
    allEntries.sort((a: any, b: any) => {
      if (b.bestScore !== a.bestScore) {
        return b.bestScore - a.bestScore;
      }
      const timeA = a.bestAttemptId?.totalTimeSeconds || 0;
      const timeB = b.bestAttemptId?.totalTimeSeconds || 0;
      return timeA - timeB;
    });

    let rank = 1;
    for (const entry of allEntries) {
      entry.rank = rank++;
      await entry.save();
    }

    return { message: 'Ranks recalculated successfully', count: allEntries.length };
  },

  async deleteEntry(id: string) {
    const entry = await Leaderboard.findByIdAndDelete(id);
    if (!entry) {
      throw new Error('Leaderboard entry not found');
    }

    // Recalculate ranks after deletion
    const filter: any = { categoryId: entry.categoryId };
    if (entry.testSetId) {
      filter.testSetId = entry.testSetId;
    }

    const allEntries = await Leaderboard.find(filter)
      .populate('bestAttemptId', 'totalTimeSeconds')
      .sort({ bestScore: -1 })
      .exec();

    allEntries.sort((a: any, b: any) => {
      if (b.bestScore !== a.bestScore) {
        return b.bestScore - a.bestScore;
      }
      const timeA = a.bestAttemptId?.totalTimeSeconds || 0;
      const timeB = b.bestAttemptId?.totalTimeSeconds || 0;
      return timeA - timeB;
    });

    let rank = 1;
    for (const entry of allEntries) {
      entry.rank = rank++;
      await entry.save();
    }

    return entry;
  },
};

