import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILeaderboard extends Document {
  categoryId: Types.ObjectId;
  testSetId?: Types.ObjectId;
  userId: Types.ObjectId;
  bestScore: number;
  bestAttemptId: Types.ObjectId;
  rank: number;
  createdAt: Date;
  updatedAt: Date;
}

const LeaderboardSchema = new Schema<ILeaderboard>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    testSetId: { type: Schema.Types.ObjectId, ref: 'TestSet' },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bestScore: { type: Number, required: true },
    bestAttemptId: { type: Schema.Types.ObjectId, ref: 'TestAttempt', required: true },
    rank: { type: Number, required: true },
  },
  { timestamps: true }
);

LeaderboardSchema.index({ categoryId: 1, testSetId: 1, rank: 1 });
LeaderboardSchema.index({ userId: 1, categoryId: 1, testSetId: 1 }, { unique: true });

export const Leaderboard = mongoose.model<ILeaderboard>('Leaderboard', LeaderboardSchema);

