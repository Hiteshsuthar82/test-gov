import { Router } from 'express';
import { testSetController } from '../controllers/testSetController';
import { studentAuthMiddleware } from '../middleware/auth';

const router = Router();

router.get('/categories/:categoryId/sets', studentAuthMiddleware, testSetController.getSetsByCategory);
// Alias for easier access
router.get('/categories/:categoryId/test-sets', studentAuthMiddleware, testSetController.getSetsByCategory);
router.get('/:setId/details', studentAuthMiddleware, testSetController.getSetDetails);
router.get('/:setId/attempts', studentAuthMiddleware, testSetController.getUserAttempts);

export default router;

