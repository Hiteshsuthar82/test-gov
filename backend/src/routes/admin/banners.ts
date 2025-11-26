import { Router } from 'express';
import { adminBannerController } from '../../controllers/adminBannerController';
import { adminAuthMiddleware } from '../../middleware/auth';
import { upload } from '../../middleware/upload';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/', adminBannerController.getAll);
router.post('/', upload.single('image'), adminBannerController.create);
router.put('/:id', upload.single('image'), adminBannerController.update);
router.delete('/:id', adminBannerController.delete);

export default router;

