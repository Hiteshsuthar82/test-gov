import { Router } from 'express';
import { comboOfferController } from '../controllers/comboOfferController';
import { studentAuthMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', comboOfferController.getAll);
router.get('/category/:categoryId', comboOfferController.getActiveForCategory);
router.get('/:id', comboOfferController.getById);

export default router;

