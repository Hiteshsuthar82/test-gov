import { Router } from 'express';
import { categoryController } from '../controllers/categoryController';
import { optionalStudentAuthMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', optionalStudentAuthMiddleware, categoryController.getAll);
router.get('/:id', optionalStudentAuthMiddleware, categoryController.getDetails);
router.get('/:id/details', optionalStudentAuthMiddleware, categoryController.getDetails);

export default router;

