import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IQuestionAnswer {
  questionId: Types.ObjectId;
  selectedOptionId: string | null;
  isCorrect: boolean;
  timeSpentSeconds: number;
  markedForReview: boolean;
}

export interface ITestAttempt extends Document {
  userId: Types.ObjectId;
  categoryId: Types.ObjectId;
  testSetId: Types.ObjectId;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_SUBMITTED';
  startedAt: Date;
  endedAt?: Date;
  questions: IQuestionAnswer[];
  totalScore: number;
  totalCorrect: number;
  totalWrong: number;
  totalUnanswered: number;
  totalTimeSeconds: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionAnswerSchema = new Schema<IQuestionAnswer>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    selectedOptionId: { type: String },
    isCorrect: { type: Boolean, default: false },
    timeSpentSeconds: { type: Number, default: 0 },
    markedForReview: { type: Boolean, default: false },
  },
  { _id: false }
);

const TestAttemptSchema = new Schema<ITestAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    testSetId: { type: Schema.Types.ObjectId, ref: 'TestSet', required: true },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'SUBMITTED', 'AUTO_SUBMITTED'],
      default: 'IN_PROGRESS',
    },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date },
    questions: [QuestionAnswerSchema],
    totalScore: { type: Number, default: 0 },
    totalCorrect: { type: Number, default: 0 },
    totalWrong: { type: Number, default: 0 },
    totalUnanswered: { type: Number, default: 0 },
    totalTimeSeconds: { type: Number, default: 0 },
  },
  { timestamps: true }
);

TestAttemptSchema.index({ userId: 1, testSetId: 1 });
TestAttemptSchema.index({ categoryId: 1, testSetId: 1 });
TestAttemptSchema.index({ status: 1 });
TestAttemptSchema.index({ createdAt: -1 });

export const TestAttempt = mongoose.model<ITestAttempt>('TestAttempt', TestAttemptSchema);

