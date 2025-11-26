import { Router } from 'express';
import { adminTestSetController } from '../../controllers/adminTestSetController';
import { adminAuthMiddleware } from '../../middleware/auth';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/categories/:categoryId/sets', adminTestSetController.getByCategory);
router.get('/:id', adminTestSetController.getById);
router.post('/categories/:categoryId/sets', adminTestSetController.create);
router.put('/:id', adminTestSetController.update);
router.delete('/:id', adminTestSetController.delete);

export default router;

