import { TestAttempt } from '../models/TestAttempt';
import { TestSet } from '../models/TestSet';
import { Question } from '../models/Question';
import { Subscription } from '../models/Subscription';
import { Leaderboard } from '../models/Leaderboard';
import { Types } from 'mongoose';

export const attemptService = {
  async startAttempt(userId: string, testSetId: string) {
    const testSet = await TestSet.findById(testSetId).populate('categoryId');
    if (!testSet) {
      throw new Error('Test set not found');
    }

    // Check subscription
    const subscription = await Subscription.findOne({
      userId: new Types.ObjectId(userId),
      categoryId: testSet.categoryId,
      status: 'APPROVED',
    });

    if (!subscription) {
      throw new Error('Subscription not approved for this category');
    }

    // Check if there's an in-progress attempt
    const existingAttempt = await TestAttempt.findOne({
      userId: new Types.ObjectId(userId),
      testSetId: new Types.ObjectId(testSetId),
      status: 'IN_PROGRESS',
    });

    if (existingAttempt) {
      // Return existing attempt
      const questions = await Question.find({
        testSetId: new Types.ObjectId(testSetId),
        isActive: true,
      })
        .sort({ questionOrder: 1 })
        .select('-correctOptionId -explanationText -explanationImageUrl');

      return {
        attemptId: existingAttempt._id,
        testSet: {
          id: testSet._id,
          name: testSet.name,
          durationMinutes: testSet.durationMinutes,
          totalMarks: testSet.totalMarks,
          negativeMarking: testSet.negativeMarking,
          sections: testSet.sections,
        },
        questions,
        startedAt: existingAttempt.startedAt,
      };
    }

    // Get all questions
    const questions = await Question.find({
      testSetId: new Types.ObjectId(testSetId),
      isActive: true,
    })
      .sort({ questionOrder: 1 })
      .select('-correctOptionId -explanationText -explanationImageUrl');

    // Create attempt with preloaded questions
    const attempt = await TestAttempt.create({
      userId: new Types.ObjectId(userId),
      categoryId: testSet.categoryId,
      testSetId: new Types.ObjectId(testSetId),
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      questions: questions.map((q) => ({
        questionId: q._id,
        selectedOptionId: null,
        isCorrect: false,
        timeSpentSeconds: 0,
        markedForReview: false,
      })),
    });

    return {
      attemptId: attempt._id,
      testSet: {
        id: testSet._id,
        name: testSet.name,
        durationMinutes: testSet.durationMinutes,
        totalMarks: testSet.totalMarks,
        negativeMarking: testSet.negativeMarking,
        sections: testSet.sections,
      },
      questions: questions.map((q) => ({
        id: q._id,
        sectionId: q.sectionId,
        questionText: q.questionText,
        questionImageUrl: q.questionImageUrl,
        options: q.options,
        marks: q.marks,
        questionOrder: q.questionOrder,
      })),
      startedAt: attempt.startedAt,
    };
  },

  async updateAnswer(
    attemptId: string,
    userId: string,
    data: {
      questionId: string;
      selectedOptionId: string | null;
      markedForReview: boolean;
      timeSpentIncrementSeconds: number;
    }
  ) {
    const attempt = await TestAttempt.findOne({
      _id: new Types.ObjectId(attemptId),
      userId: new Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    });

    if (!attempt) {
      throw new Error('Attempt not found or not in progress');
    }

    const questionIndex = attempt.questions.findIndex(
      (q) => q.questionId.toString() === data.questionId
    );

    if (questionIndex === -1) {
      throw new Error('Question not found in attempt');
    }

    attempt.questions[questionIndex].selectedOptionId = data.selectedOptionId;
    attempt.questions[questionIndex].markedForReview = data.markedForReview;
    attempt.questions[questionIndex].timeSpentSeconds += data.timeSpentIncrementSeconds;

    await attempt.save();

    return attempt.questions[questionIndex];
  },

  async submitAttempt(attemptId: string, userId: string, reason?: string) {
    const attempt = await TestAttempt.findOne({
      _id: new Types.ObjectId(attemptId),
      userId: new Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    }).populate('testSetId');

    if (!attempt) {
      throw new Error('Attempt not found or not in progress');
    }

    const testSet = attempt.testSetId as any;
    const questionIds = attempt.questions.map((q) => q.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });

    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    let totalCorrect = 0;
    let totalWrong = 0;
    let totalUnanswered = 0;
    let totalScore = 0;

    attempt.questions.forEach((qa) => {
      const question = questionMap.get(qa.questionId.toString());
      if (!question) return;

      if (!qa.selectedOptionId) {
        totalUnanswered++;
        qa.isCorrect = false;
      } else if (qa.selectedOptionId === question.correctOptionId) {
        totalCorrect++;
        qa.isCorrect = true;
        totalScore += question.marks;
      } else {
        totalWrong++;
        qa.isCorrect = false;
        totalScore -= testSet.negativeMarking;
      }
    });

    const endedAt = new Date();
    const totalTimeSeconds = Math.floor((endedAt.getTime() - attempt.startedAt.getTime()) / 1000);

    attempt.status = reason === 'AUTO_SUBMIT' ? 'AUTO_SUBMITTED' : 'SUBMITTED';
    attempt.endedAt = endedAt;
    attempt.totalCorrect = totalCorrect;
    attempt.totalWrong = totalWrong;
    attempt.totalUnanswered = totalUnanswered;
    attempt.totalScore = Math.max(0, totalScore); // Ensure non-negative
    attempt.totalTimeSeconds = totalTimeSeconds;

    await attempt.save();

    // Update leaderboard
    await this.updateLeaderboard(attempt);

    return {
      attemptId: attempt._id,
      totalScore: attempt.totalScore,
      totalCorrect,
      totalWrong,
      totalUnanswered,
      totalTimeSeconds,
      status: attempt.status,
      endedAt,
    };
  },

  async updateLeaderboard(attempt: any) {
    const categoryId = attempt.categoryId;
    const testSetId = attempt.testSetId;
    const userId = attempt.userId;

    // Find or create leaderboard entry
    let leaderboard = await Leaderboard.findOne({
      categoryId,
      testSetId,
      userId,
    });

    if (!leaderboard || attempt.totalScore > leaderboard.bestScore) {
      if (leaderboard) {
        leaderboard.bestScore = attempt.totalScore;
        leaderboard.bestAttemptId = attempt._id;
      } else {
        leaderboard = await Leaderboard.create({
          categoryId,
          testSetId,
          userId,
          bestScore: attempt.totalScore,
          bestAttemptId: attempt._id,
          rank: 0, // Will be recalculated
        });
      }

      // Recalculate ranks
      const allEntries = await Leaderboard.find({
        categoryId,
        testSetId,
      })
        .sort({ bestScore: -1, totalTimeSeconds: 1 })
        .exec();

      let rank = 1;
      for (const entry of allEntries) {
        entry.rank = rank++;
        await entry.save();
      }
    }
  },

  async getAttempt(attemptId: string, userId: string) {
    const attempt = await TestAttempt.findOne({
      _id: new Types.ObjectId(attemptId),
      userId: new Types.ObjectId(userId),
    })
      .populate('testSetId', 'name durationMinutes totalMarks')
      .populate('categoryId', 'name');

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    return attempt;
  },

  async getDeepDive(attemptId: string, userId: string) {
    const attempt = await TestAttempt.findOne({
      _id: new Types.ObjectId(attemptId),
      userId: new Types.ObjectId(userId),
    });

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const questionIds = attempt.questions.map((q) => q.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });

    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    const detailedQuestions = attempt.questions.map((qa) => {
      const question = questionMap.get(qa.questionId.toString());
      if (!question) return null;

      return {
        questionId: question._id,
        sectionId: question.sectionId,
        questionText: question.questionText,
        questionImageUrl: question.questionImageUrl,
        options: question.options,
        correctOptionId: question.correctOptionId,
        selectedOptionId: qa.selectedOptionId,
        isCorrect: qa.isCorrect,
        marks: question.marks,
        explanationText: question.explanationText,
        explanationImageUrl: question.explanationImageUrl,
        timeSpentSeconds: qa.timeSpentSeconds,
        markedForReview: qa.markedForReview,
      };
    }).filter(Boolean);

    return {
      attemptId: attempt._id,
      totalScore: attempt.totalScore,
      totalCorrect: attempt.totalCorrect,
      totalWrong: attempt.totalWrong,
      totalUnanswered: attempt.totalUnanswered,
      status: attempt.status,
      startedAt: attempt.startedAt,
      endedAt: attempt.endedAt,
      questions: detailedQuestions,
    };
  },
};

