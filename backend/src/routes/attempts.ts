import { Router } from 'express';
import { attemptController } from '../controllers/attemptController';
import { studentAuthMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { z } from 'zod';

const router = Router();

const startAttemptSchema = z.object({
  body: z.object({
    testSetId: z.string().min(1),
    forceNew: z.boolean().optional(),
  }),
});

const updateAnswerSchema = z.object({
  body: z.object({
    questionId: z.string().min(1),
    selectedOptionId: z.string().nullable(),
    markedForReview: z.boolean(),
    timeSpentIncrementSeconds: z.number().min(0),
  }),
});

const updateReviewSchema = z.object({
  body: z.object({
    questionId: z.string().min(1),
    markedForReview: z.boolean(),
    timeSpentIncrementSeconds: z.number().min(0).optional(),
  }),
});

const submitSectionSchema = z.object({
  body: z.object({
    sectionId: z.string().min(1),
    questionId: z.string().optional(),
    timeSpentIncrementSeconds: z.number().min(0).optional(),
  }),
});

router.post('/start', studentAuthMiddleware, validate(startAttemptSchema), attemptController.start);
router.patch('/:attemptId/answer', studentAuthMiddleware, validate(updateAnswerSchema), attemptController.updateAnswer);
router.put('/:attemptId/answer', studentAuthMiddleware, attemptController.updateAnswer);
router.put('/:attemptId/review', studentAuthMiddleware, validate(updateReviewSchema), attemptController.updateReview);
router.post('/:attemptId/submit', studentAuthMiddleware, attemptController.submit);
router.post('/:attemptId/submit-section', studentAuthMiddleware, validate(submitSectionSchema), attemptController.submitSection);
router.get('/:attemptId/section-timer', studentAuthMiddleware, attemptController.checkSectionTimer);
router.get('/:attemptId', studentAuthMiddleware, attemptController.getAttempt);
router.get('/:attemptId/deep-dive', studentAuthMiddleware, attemptController.getDeepDive);
router.post('/:attemptId/pause', studentAuthMiddleware, attemptController.pauseAttempt);
router.post('/:attemptId/resume', studentAuthMiddleware, attemptController.resumeAttempt);
router.get('/', studentAuthMiddleware, attemptController.getUserAttempts);
router.get('/in-progress/list', studentAuthMiddleware, attemptController.getInProgressAttempts);

export default router;

