import { Router } from 'express';
import { adminQuestionController } from '../../controllers/adminQuestionController';
import { adminAuthMiddleware } from '../../middleware/auth';
import { upload } from '../../middleware/upload';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/sets/:setId/questions', adminQuestionController.getByTestSet);
router.get('/:id', adminQuestionController.getById);
router.post('/sets/:setId/questions', upload.fields([{ name: 'questionImage' }, { name: 'explanationImage' }]), adminQuestionController.create);
router.post('/sets/:setId/questions/bulk', adminQuestionController.bulkCreate);
router.put('/:id', upload.fields([{ name: 'questionImage' }, { name: 'explanationImage' }]), adminQuestionController.update);
router.delete('/:id', adminQuestionController.delete);

export default router;

