import { Router } from 'express';
import { adminCategoryController } from '../../controllers/adminCategoryController';
import { adminAuthMiddleware } from '../../middleware/auth';
import { upload } from '../../middleware/upload';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/', adminCategoryController.getAll);
router.get('/:id', adminCategoryController.getById);
router.post('/', upload.single('bannerImage'), adminCategoryController.create);
router.put('/:id', upload.single('bannerImage'), adminCategoryController.update);
router.delete('/:id', adminCategoryController.delete);

export default router;

