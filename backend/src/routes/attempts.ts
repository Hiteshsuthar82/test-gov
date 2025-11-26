import { Router } from 'express';
import { attemptController } from '../controllers/attemptController';
import { studentAuthMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { z } from 'zod';

const router = Router();

const startAttemptSchema = z.object({
  body: z.object({
    testSetId: z.string().min(1),
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

const submitSectionSchema = z.object({
  body: z.object({
    sectionId: z.string().min(1),
  }),
});

router.post('/start', studentAuthMiddleware, validate(startAttemptSchema), attemptController.start);
router.patch('/:attemptId/answer', studentAuthMiddleware, validate(updateAnswerSchema), attemptController.updateAnswer);
router.post('/:attemptId/submit', studentAuthMiddleware, attemptController.submit);
router.post('/:attemptId/submit-section', studentAuthMiddleware, validate(submitSectionSchema), attemptController.submitSection);
router.get('/:attemptId/section-timer', studentAuthMiddleware, attemptController.checkSectionTimer);
router.get('/:attemptId', studentAuthMiddleware, attemptController.getAttempt);
router.get('/:attemptId/deep-dive', studentAuthMiddleware, attemptController.getDeepDive);

export default router;

