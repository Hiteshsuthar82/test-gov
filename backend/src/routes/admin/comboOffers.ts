import { Router } from 'express';
import { adminComboOfferController } from '../../controllers/adminComboOfferController';
import { adminAuthMiddleware } from '../../middleware/auth';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/', adminComboOfferController.getAll);
router.get('/:id', adminComboOfferController.getById);
router.post('/', adminComboOfferController.create);
router.put('/:id', adminComboOfferController.update);
router.delete('/:id', adminComboOfferController.delete);

export default router;

