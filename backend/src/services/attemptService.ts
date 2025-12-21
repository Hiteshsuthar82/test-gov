import { TestAttempt } from '../models/TestAttempt';
import { TestSet } from '../models/TestSet';
import { Question } from '../models/Question';
import { Subscription } from '../models/Subscription';
import { Leaderboard } from '../models/Leaderboard';
import { Types } from 'mongoose';

export const attemptService = {
  async startAttempt(userId: string, testSetId: string, forceNew: boolean = false) {
    const testSet = await TestSet.findById(testSetId).populate('categoryId');
    if (!testSet) {
      throw new Error('Test set not found');
    }

    // Check subscription - only required if test is not free
    if (!testSet.isFree) {
      const subscription = await Subscription.findOne({
        userId: new Types.ObjectId(userId),
        categoryId: testSet.categoryId,
        status: 'APPROVED',
      });

      if (!subscription) {
        throw new Error('Subscription not approved for this category');
      }
    }

    // Check if there's an in-progress attempt (only if not forcing new)
    if (!forceNew) {
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
          .select('-correctOptionId -explanationText -explanationImageUrls');

        return {
          attemptId: existingAttempt._id,
          testSet: {
            id: testSet._id,
            name: testSet.name,
            durationMinutes: testSet.durationMinutes,
            totalMarks: testSet.totalMarks,
            negativeMarking: testSet.negativeMarking,
            sections: testSet.sections,
            hasSectionWiseTiming: testSet.hasSectionWiseTiming,
          },
          questions,
          startedAt: existingAttempt.startedAt,
          currentSectionId: existingAttempt.currentSectionId,
          sectionTimings: existingAttempt.sectionTimings,
        };
      }
    }

    // Get all questions
    const questions = await Question.find({
      testSetId: new Types.ObjectId(testSetId),
      isActive: true,
    })
      .sort({ questionOrder: 1 })
      .select('-correctOptionId -explanationText -explanationImageUrls');

    // Initialize section timings if section-wise timing is enabled
    const sectionTimings = testSet.hasSectionWiseTiming && testSet.sections.length > 0
      ? testSet.sections.map((section, index) => ({
          sectionId: section.sectionId,
          startedAt: index === 0 ? new Date() : new Date(0), // Only first section starts immediately
          timeSpentSeconds: 0,
          status: index === 0 ? 'IN_PROGRESS' : 'IN_PROGRESS' as const,
        }))
      : undefined;

    // Create attempt with preloaded questions
    const now = new Date();
    const attempt = await TestAttempt.create({
      userId: new Types.ObjectId(userId),
      categoryId: testSet.categoryId,
      testSetId: new Types.ObjectId(testSetId),
      status: 'IN_PROGRESS',
      startedAt: now,
      lastActiveAt: now, // Initialize lastActiveAt when test starts
      questions: questions.map((q) => ({
        questionId: q._id,
        selectedOptionId: null,
        isCorrect: false,
        timeSpentSeconds: 0,
        markedForReview: false,
      })),
      sectionTimings,
      currentSectionId: testSet.hasSectionWiseTiming && testSet.sections.length > 0
        ? testSet.sections[0].sectionId
        : undefined,
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
        hasSectionWiseTiming: testSet.hasSectionWiseTiming,
      },
      questions: questions.map((q) => ({
        id: q._id,
        _id: q._id,
        sectionId: q.sectionId,
        direction: q.direction,
        directionImageUrl: q.directionImageUrl,
        questionText: q.questionText,
        questionFormattedText: q.questionFormattedText,
        questionImageUrl: q.questionImageUrl,
        conclusion: q.conclusion,
        conclusionImageUrl: q.conclusionImageUrl,
        options: q.options,
        marks: q.marks,
        averageTimeSeconds: q.averageTimeSeconds,
        questionOrder: q.questionOrder,
      })),
      startedAt: attempt.startedAt,
      currentSectionId: attempt.currentSectionId,
      sectionTimings: attempt.sectionTimings,
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
    }).populate('testSetId');

    if (!attempt) {
      throw new Error('Attempt not found or not in progress');
    }

    const testSet = attempt.testSetId as any;

    // If section-wise timing is enabled, update section timing
    if (testSet.hasSectionWiseTiming && attempt.sectionTimings && attempt.currentSectionId) {
      const sectionTiming = attempt.sectionTimings.find(
        (st) => st.sectionId === attempt.currentSectionId && st.status === 'IN_PROGRESS'
      );
      if (sectionTiming) {
        sectionTiming.timeSpentSeconds += data.timeSpentIncrementSeconds;
      }
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

  async submitSection(
    attemptId: string,
    userId: string,
    sectionId: string,
    questionId?: string,
    timeSpentIncrementSeconds?: number
  ) {
    const attempt = await TestAttempt.findOne({
      _id: new Types.ObjectId(attemptId),
      userId: new Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    }).populate('testSetId');

    if (!attempt) {
      throw new Error('Attempt not found or not in progress');
    }

    const testSet = attempt.testSetId as any;
    if (!testSet.hasSectionWiseTiming) {
      throw new Error('Section-wise timing is not enabled for this test');
    }

    // Update time spent for current question if provided
    if (questionId && timeSpentIncrementSeconds !== undefined && timeSpentIncrementSeconds > 0) {
      const question = attempt.questions.find(
        (q) => q.questionId.toString() === questionId
      );
      
      if (question) {
        // If section-wise timing is enabled, update section timing
        if (attempt.sectionTimings && attempt.currentSectionId) {
          const sectionTiming = attempt.sectionTimings.find(
            (st) => st.sectionId === attempt.currentSectionId && st.status === 'IN_PROGRESS'
          );
          if (sectionTiming) {
            sectionTiming.timeSpentSeconds += timeSpentIncrementSeconds;
          }
        }
        
        question.timeSpentSeconds += timeSpentIncrementSeconds;
      }
    }

    // Find and end the current section
    const sectionTiming = attempt.sectionTimings?.find(
      (st) => st.sectionId === sectionId && st.status === 'IN_PROGRESS'
    );

    if (!sectionTiming) {
      throw new Error('Section not found or already completed');
    }

    const now = new Date();
    sectionTiming.endedAt = now;
    sectionTiming.status = 'COMPLETED';
    sectionTiming.timeSpentSeconds = Math.floor(
      (now.getTime() - sectionTiming.startedAt.getTime()) / 1000
    );

    // Find next section
    const currentSectionIndex = testSet.sections.findIndex(
      (s: any) => s.sectionId === sectionId
    );
    const nextSection = testSet.sections[currentSectionIndex + 1];

    if (nextSection) {
      // Start next section
      const nextSectionTiming = attempt.sectionTimings?.find(
        (st) => st.sectionId === nextSection.sectionId
      );
      if (nextSectionTiming) {
        nextSectionTiming.startedAt = now;
        nextSectionTiming.status = 'IN_PROGRESS';
        attempt.currentSectionId = nextSection.sectionId;
      }
    } else {
      // All sections completed, submit entire test
      attempt.currentSectionId = undefined;
      await this.submitAttempt(attemptId, userId, 'AUTO_SUBMIT');
      return { message: 'All sections completed. Test submitted.', testCompleted: true };
    }

    await attempt.save();

    return {
      message: 'Section submitted successfully',
      currentSectionId: attempt.currentSectionId,
      sectionTimings: attempt.sectionTimings,
      testCompleted: false,
    };
  },

  async checkSectionTimer(attemptId: string, userId: string) {
    const attempt = await TestAttempt.findOne({
      _id: new Types.ObjectId(attemptId),
      userId: new Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    }).populate('testSetId');

    if (!attempt) {
      throw new Error('Attempt not found or not in progress');
    }

    const testSet = attempt.testSetId as any;
    if (!testSet.hasSectionWiseTiming || !attempt.currentSectionId) {
      return { hasSectionTiming: false };
    }

    const currentSection = testSet.sections.find(
      (s: any) => s.sectionId === attempt.currentSectionId
    );
    const sectionTiming = attempt.sectionTimings?.find(
      (st) => st.sectionId === attempt.currentSectionId && st.status === 'IN_PROGRESS'
    );

    if (!currentSection || !sectionTiming || !currentSection.durationMinutes) {
      return { hasSectionTiming: false };
    }

    const now = new Date();
    const elapsedSeconds = Math.floor(
      (now.getTime() - sectionTiming.startedAt.getTime()) / 1000
    );
    const totalSeconds = currentSection.durationMinutes * 60;
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

    // Auto-submit if time expired
    if (remainingSeconds === 0) {
      await this.submitSection(attemptId, userId, attempt.currentSectionId);
      return {
        hasSectionTiming: true,
        timeExpired: true,
        remainingSeconds: 0,
        sectionId: attempt.currentSectionId,
      };
    }

    return {
      hasSectionTiming: true,
      sectionId: attempt.currentSectionId,
      durationMinutes: currentSection.durationMinutes,
      elapsedSeconds,
      remainingSeconds,
      sectionTiming: {
        startedAt: sectionTiming.startedAt,
        timeSpentSeconds: elapsedSeconds,
      },
    };
  },

  async submitAttempt(
    attemptId: string,
    userId: string,
    reason?: string,
    questionId?: string,
    timeSpentIncrementSeconds?: number
  ) {
    const attempt = await TestAttempt.findOne({
      _id: new Types.ObjectId(attemptId),
      userId: new Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    }).populate('testSetId');

    if (!attempt) {
      throw new Error('Attempt not found or not in progress');
    }

    // Update time spent for current question if provided
    if (questionId && timeSpentIncrementSeconds !== undefined && timeSpentIncrementSeconds > 0) {
      const question = attempt.questions.find(
        (q) => q.questionId.toString() === questionId
      );
      
      if (question) {
        const testSet = attempt.testSetId as any;
        
        // If section-wise timing is enabled, update section timing
        if (testSet.hasSectionWiseTiming && attempt.sectionTimings && attempt.currentSectionId) {
          const sectionTiming = attempt.sectionTimings.find(
            (st) => st.sectionId === attempt.currentSectionId && st.status === 'IN_PROGRESS'
          );
          if (sectionTiming) {
            sectionTiming.timeSpentSeconds += timeSpentIncrementSeconds;
          }
        }
        
        question.timeSpentSeconds += timeSpentIncrementSeconds;
      }
    }

    const testSet = attempt.testSetId as any;
    const questionIds = attempt.questions.map((q) => q.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });

    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    let totalCorrect = 0;
    let totalWrong = 0;
    let totalUnanswered = 0;
    let totalScore = 0;

    let totalTimeSeconds = 0; // Sum of all question times
    
    attempt.questions.forEach((qa) => {
      const question = questionMap.get(qa.questionId.toString());
      if (!question) return;

      // Sum up time spent on each question
      totalTimeSeconds += qa.timeSpentSeconds || 0;

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

      // Recalculate ranks - sort by bestScore (desc) and then by attempt time (asc)
      const allEntries = await Leaderboard.find({
        categoryId,
        testSetId,
      })
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
    }
  },

  async getAttempt(attemptId: string, userId: string) {
    const attempt = await TestAttempt.findOne({
      _id: new Types.ObjectId(attemptId),
      userId: new Types.ObjectId(userId),
    })
      .populate('testSetId', 'name durationMinutes totalMarks negativeMarking sections hasSectionWiseTiming')
      .populate('categoryId', 'name');

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    // If test is in progress, handle pause/resume tracking
    const now = new Date();
    if (attempt.status === 'IN_PROGRESS') {
      if (attempt.lastActiveAt) {
        // Test is active - check if there was a gap (user was away)
        const timeSinceLastActive = Math.floor((now.getTime() - attempt.lastActiveAt.getTime()) / 1000);
        // If more than 5 seconds since last activity, user was away - add to pause time
        if (timeSinceLastActive > 5) {
          attempt.totalPausedSeconds += timeSinceLastActive;
        }
        // Update lastActiveAt to current time to track current activity
        attempt.lastActiveAt = now;
        await attempt.save();
      }
      // If lastActiveAt is null, test was explicitly paused - don't change it
      // Frontend will call resumeAttempt when user wants to resume
    }

    // Get full question details
    const questionIds = attempt.questions.map((q) => q.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } })
      .sort({ questionOrder: 1 })
      .select('-correctOptionId -explanationText -explanationFormattedText -explanationImageUrls');

    // Map questions by ID for easy lookup
    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    // Combine attempt data with full question details
    const questionsWithDetails = attempt.questions.map((qa) => {
      const question = questionMap.get(qa.questionId.toString());
      if (!question) return null;

      const enContent = question.languages.en;
      
      return {
        _id: question._id.toString(),
        id: question._id.toString(),
        sectionId: question.sectionId,
        languages: question.languages,
        direction: enContent.direction,
        directionImageUrl: enContent.directionImageUrl,
        questionText: enContent.questionText,
        questionFormattedText: enContent.questionFormattedText,
        questionImageUrl: enContent.questionImageUrl,
        conclusion: enContent.conclusion,
        conclusionImageUrl: enContent.conclusionImageUrl,
        options: enContent.options,
        marks: question.marks,
        averageTimeSeconds: question.averageTimeSeconds,
        questionOrder: question.questionOrder,
        selectedOptionId: qa.selectedOptionId,
        markedForReview: qa.markedForReview,
        timeSpentSeconds: qa.timeSpentSeconds,
      };
    }).filter(Boolean);

    const testSet = attempt.testSetId as any;

    // Calculate actual elapsed time (excluding pause time)
    const actualElapsedSeconds = attempt.status === 'IN_PROGRESS' && attempt.lastActiveAt
      ? Math.floor((attempt.lastActiveAt.getTime() - attempt.startedAt.getTime()) / 1000) - attempt.totalPausedSeconds
      : attempt.totalTimeSeconds;

    return {
      attemptId: attempt._id,
      testSet: {
        id: testSet._id || testSet,
        name: testSet.name,
        durationMinutes: testSet.durationMinutes,
        totalMarks: testSet.totalMarks,
        negativeMarking: testSet.negativeMarking,
        sections: testSet.sections,
        hasSectionWiseTiming: testSet.hasSectionWiseTiming,
      },
      questions: questionsWithDetails,
      status: attempt.status,
      startedAt: attempt.startedAt,
      endedAt: attempt.endedAt,
      currentSectionId: attempt.currentSectionId,
      sectionTimings: attempt.sectionTimings,
      lastActiveAt: attempt.lastActiveAt,
      totalPausedSeconds: attempt.totalPausedSeconds,
      actualElapsedSeconds: Math.max(0, actualElapsedSeconds),
    };
  },

  async getDeepDive(attemptId: string, userId: string) {
    const attempt = await TestAttempt.findOne({
      _id: new Types.ObjectId(attemptId),
      userId: new Types.ObjectId(userId),
    }).populate('testSetId', 'totalMarks');

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const testSet = attempt.testSetId as any;
    const totalMarks = testSet?.totalMarks || 0;

    const questionIds = attempt.questions.map((q) => q.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });

    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    const detailedQuestions = attempt.questions.map((qa) => {
      const question = questionMap.get(qa.questionId.toString());
      if (!question) return null;

      const enContent = question.languages.en;

      return {
        questionId: question._id,
        sectionId: question.sectionId,
        languages: question.languages,
        direction: enContent.direction,
        directionFormattedText: enContent.directionFormattedText,
        directionImageUrl: enContent.directionImageUrl,
        questionText: enContent.questionText,
        questionFormattedText: enContent.questionFormattedText,
        questionImageUrl: enContent.questionImageUrl,
        conclusion: enContent.conclusion,
        conclusionFormattedText: enContent.conclusionFormattedText,
        conclusionImageUrl: enContent.conclusionImageUrl,
        options: enContent.options,
        correctOptionId: question.correctOptionId,
        selectedOptionId: qa.selectedOptionId,
        isCorrect: qa.isCorrect,
        marks: question.marks,
        explanationText: enContent.explanationText,
        explanationFormattedText: enContent.explanationFormattedText,
        explanationImageUrls: enContent.explanationImageUrls || [],
        timeSpentSeconds: qa.timeSpentSeconds,
        markedForReview: qa.markedForReview,
      };
    }).filter(Boolean);

    return {
      attemptId: attempt._id,
      totalScore: attempt.totalScore,
      totalMarks: totalMarks,
      totalCorrect: attempt.totalCorrect,
      totalWrong: attempt.totalWrong,
      totalUnanswered: attempt.totalUnanswered,
      status: attempt.status,
      startedAt: attempt.startedAt,
      endedAt: attempt.endedAt,
      questions: detailedQuestions,
    };
  },

  async updateReview(
    attemptId: string,
    userId: string,
    questionId: string,
    markedForReview: boolean,
    timeSpentIncrementSeconds?: number
  ) {
    const attempt = await TestAttempt.findOne({
      _id: new Types.ObjectId(attemptId),
      userId: new Types.ObjectId(userId),
    }).populate('testSetId');

    if (!attempt) {
      throw new Error('Attempt not found');
    }

    const question = attempt.questions.find(
      (q) => q.questionId.toString() === questionId
    );

    if (question) {
      question.markedForReview = markedForReview;
      
      // Update time spent if provided
      if (timeSpentIncrementSeconds !== undefined && timeSpentIncrementSeconds > 0) {
        const testSet = attempt.testSetId as any;
        
        // If section-wise timing is enabled, update section timing
        if (testSet.hasSectionWiseTiming && attempt.sectionTimings && attempt.currentSectionId) {
          const sectionTiming = attempt.sectionTimings.find(
            (st) => st.sectionId === attempt.currentSectionId && st.status === 'IN_PROGRESS'
          );
          if (sectionTiming) {
            sectionTiming.timeSpentSeconds += timeSpentIncrementSeconds;
          }
        }
        
        question.timeSpentSeconds += timeSpentIncrementSeconds;
      }
      
      await attempt.save();
    }

    return { message: 'Review status updated' };
  },

  async getUserAttempts(userId: string, categoryId?: string) {
    const filter: any = {
      userId: new Types.ObjectId(userId),
    };

    if (categoryId) {
      filter.categoryId = new Types.ObjectId(categoryId);
    }

    const attempts = await TestAttempt.find(filter)
      .populate('testSetId', 'name')
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return attempts;
  },

  async pauseAttempt(
    attemptId: string,
    userId: string,
    questionId?: string,
    timeSpentIncrementSeconds?: number
  ) {
    const attempt = await TestAttempt.findOne({
      _id: new Types.ObjectId(attemptId),
      userId: new Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    }).populate('testSetId');

    if (!attempt) {
      throw new Error('Attempt not found or not in progress');
    }

    const now = new Date();
    
    // Update time spent for current question if provided
    if (questionId && timeSpentIncrementSeconds !== undefined && timeSpentIncrementSeconds > 0) {
      const question = attempt.questions.find(
        (q) => q.questionId.toString() === questionId
      );
      
      if (question) {
        const testSet = attempt.testSetId as any;
        
        // If section-wise timing is enabled, update section timing
        if (testSet.hasSectionWiseTiming && attempt.sectionTimings && attempt.currentSectionId) {
          const sectionTiming = attempt.sectionTimings.find(
            (st) => st.sectionId === attempt.currentSectionId && st.status === 'IN_PROGRESS'
          );
          if (sectionTiming) {
            sectionTiming.timeSpentSeconds += timeSpentIncrementSeconds;
          }
        }
        
        question.timeSpentSeconds += timeSpentIncrementSeconds;
      }
    }
    
    // If lastActiveAt exists, calculate pause time and add to totalPausedSeconds
    if (attempt.lastActiveAt) {
      const pauseDuration = Math.floor((now.getTime() - attempt.lastActiveAt.getTime()) / 1000);
      if (pauseDuration > 0) {
        attempt.totalPausedSeconds += pauseDuration;
      }
    }
    
    // Clear lastActiveAt to indicate test is paused
    attempt.lastActiveAt = undefined;
    
    // Update section timing if section-wise
    const testSet = attempt.testSetId as any;
    if (testSet?.hasSectionWiseTiming && attempt.sectionTimings && attempt.currentSectionId) {
      const sectionTiming = attempt.sectionTimings.find(
        (st) => st.sectionId === attempt.currentSectionId && st.status === 'IN_PROGRESS'
      );
      if (sectionTiming) {
        // Calculate active time (excluding pause time)
        const activeTime = Math.floor((now.getTime() - sectionTiming.startedAt.getTime()) / 1000) - attempt.totalPausedSeconds;
        sectionTiming.timeSpentSeconds = Math.max(0, activeTime);
      }
    }

    await attempt.save();

    return {
      message: 'Test paused',
      pausedAt: now,
      totalPausedSeconds: attempt.totalPausedSeconds,
    };
  },

  async resumeAttempt(
    attemptId: string,
    userId: string,
    questionId?: string,
    timeSpentIncrementSeconds?: number
  ) {
    const attempt = await TestAttempt.findOne({
      _id: new Types.ObjectId(attemptId),
      userId: new Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    }).populate('testSetId');

    if (!attempt) {
      throw new Error('Attempt not found or not in progress');
    }

    const now = new Date();
    
    // Update time spent for current question if provided
    if (questionId && timeSpentIncrementSeconds !== undefined && timeSpentIncrementSeconds > 0) {
      const question = attempt.questions.find(
        (q) => q.questionId.toString() === questionId
      );
      
      if (question) {
        const testSet = attempt.testSetId as any;
        
        // If section-wise timing is enabled, update section timing
        if (testSet.hasSectionWiseTiming && attempt.sectionTimings && attempt.currentSectionId) {
          const sectionTiming = attempt.sectionTimings.find(
            (st) => st.sectionId === attempt.currentSectionId && st.status === 'IN_PROGRESS'
          );
          if (sectionTiming) {
            sectionTiming.timeSpentSeconds += timeSpentIncrementSeconds;
          }
        }
        
        question.timeSpentSeconds += timeSpentIncrementSeconds;
      }
    }
    
    // If lastActiveAt was null (test was paused), calculate pause duration since pause
    if (!attempt.lastActiveAt) {
      // Test was explicitly paused - calculate pause time since last update
      // Use updatedAt as a proxy for when pause happened
      const lastUpdate = attempt.updatedAt || attempt.startedAt;
      const pauseDuration = Math.floor((now.getTime() - lastUpdate.getTime()) / 1000);
      if (pauseDuration > 0) {
        attempt.totalPausedSeconds += pauseDuration;
      }
    } else {
      // If lastActiveAt exists, there might have been a gap since last activity
      const timeSinceLastActive = Math.floor((now.getTime() - attempt.lastActiveAt.getTime()) / 1000);
      if (timeSinceLastActive > 5) {
        attempt.totalPausedSeconds += timeSinceLastActive;
      }
    }
    
    // Set lastActiveAt to now to resume the test
    attempt.lastActiveAt = now;
    
    await attempt.save();

    return {
      message: 'Test resumed',
      resumedAt: now,
      totalPausedSeconds: attempt.totalPausedSeconds,
    };
  },

  async getInProgressAttempts(userId: string, testSetId?: string) {
    const query: any = {
      userId: new Types.ObjectId(userId),
      status: 'IN_PROGRESS',
    };

    if (testSetId) {
      query.testSetId = new Types.ObjectId(testSetId);
    }

    const attempts = await TestAttempt.find(query)
      .populate('testSetId', 'name durationMinutes totalMarks')
      .populate('categoryId', 'name')
      .sort({ startedAt: -1 });

    return attempts;
  },
};

