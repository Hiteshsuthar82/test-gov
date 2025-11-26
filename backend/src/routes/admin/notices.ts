import { Router } from 'express';
import { adminNoticeController } from '../../controllers/adminNoticeController';
import { adminAuthMiddleware } from '../../middleware/auth';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/', adminNoticeController.getAll);
router.post('/', adminNoticeController.create);
router.put('/:id', adminNoticeController.update);
router.delete('/:id', adminNoticeController.delete);

export default router;

