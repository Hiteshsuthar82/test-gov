import { Leaderboard } from '../models/Leaderboard';
import { TestAttempt } from '../models/TestAttempt';
import { User } from '../models/User';
import { Types } from 'mongoose';

export const leaderboardService = {
  async getLeaderboard(query: {
    categoryId: string;
    testSetId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = parseInt(query.page?.toString() || '1', 10);
    const limit = parseInt(query.limit?.toString() || '50', 10);
    const skip = (page - 1) * limit;

    const filter: any = {
      categoryId: new Types.ObjectId(query.categoryId),
    };

    if (query.testSetId) {
      filter.testSetId = new Types.ObjectId(query.testSetId);
    }

    // If leaderboard collection exists, use it
    const leaderboardEntries = await Leaderboard.find(filter)
      .populate('userId', 'name email')
      .populate('testSetId', '_id')
      .populate('bestAttemptId', 'totalTimeSeconds')
      .sort({ rank: 1 })
      .skip(skip)
      .limit(limit);

    if (leaderboardEntries.length > 0) {
      const total = await Leaderboard.countDocuments(filter)
      return {
        leaderboard: leaderboardEntries.map((entry: any) => ({
          rank: entry.rank,
          userId: entry.userId._id,
          testSetId: entry.testSetId?._id || entry.testSetId?.toString() || entry.testSetId,
          userName: entry.userId.name,
          userEmail: entry.userId.email?.replace(/(.{2})(.*)(@.*)/, '$1***$3'), // Mask email
          score: entry.bestScore,
          timeSeconds: entry.bestAttemptId?.totalTimeSeconds || 0,
        })),
        pagination: {
          page,
          limit,
          total,
        },
      };
    }

    // Fallback: compute from attempts
    const attempts = await TestAttempt.aggregate([
      {
        $match: {
          categoryId: new Types.ObjectId(query.categoryId),
          ...(query.testSetId && { testSetId: new Types.ObjectId(query.testSetId) }),
          status: { $in: ['SUBMITTED', 'AUTO_SUBMITTED'] },
        },
      },
      {
        $sort: { totalScore: -1, totalTimeSeconds: 1 },
      },
      {
        $group: {
          _id: '$userId',
          bestScore: { $max: '$totalScore' },
          bestAttempt: { $first: '$$ROOT' },
        },
      },
      {
        $sort: { bestScore: -1 },
      },
      {
        $skip: skip,
      },
      {
        $limit: limit,
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
    ]);

    const userIds = attempts.map((a) => a._id);
    const users = await User.find({ _id: { $in: userIds } });

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    return {
      leaderboard: attempts.map((entry, index) => ({
        rank: skip + index + 1,
        userId: entry._id,
        testSetId: entry.bestAttempt.testSetId,
        userName: userMap.get(entry._id.toString())?.name || 'Unknown',
        userEmail: userMap.get(entry._id.toString())?.email?.replace(/(.{2})(.*)(@.*)/, '$1***$3') || '',
        score: entry.bestScore,
        timeSeconds: entry.bestAttempt.totalTimeSeconds || 0,
      })),
      pagination: {
        page,
        limit,
        total: attempts.length, // Approximate
      },
    };
  },
};

