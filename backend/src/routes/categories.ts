import { Router } from 'express';
import { categoryController } from '../controllers/categoryController';
import { optionalStudentAuthMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', categoryController.getAll);
router.get('/:id/details', optionalStudentAuthMiddleware, categoryController.getDetails);

export default router;

