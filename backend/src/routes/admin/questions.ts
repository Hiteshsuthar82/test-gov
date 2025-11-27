import { Router } from 'express';
import { adminQuestionController } from '../../controllers/adminQuestionController';
import { adminAuthMiddleware } from '../../middleware/auth';
import { upload } from '../../middleware/upload';

const router = Router();

router.use(adminAuthMiddleware);

router.get('/sets/:setId/questions', adminQuestionController.getByTestSet);
router.get('/:id', adminQuestionController.getById);
// Use upload.any() to handle dynamic fields (questionImage, explanationImage, optionImage_0, optionImage_1, etc.)
router.post('/sets/:setId/questions', upload.any(), adminQuestionController.create);
router.post('/sets/:setId/questions/bulk', adminQuestionController.bulkCreate);
router.put('/:id', upload.any(), adminQuestionController.update);
router.delete('/:id', adminQuestionController.delete);

export default router;

