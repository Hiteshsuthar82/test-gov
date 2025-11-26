import { Router } from 'express';
import { noticeController } from '../controllers/noticeController';

const router = Router();

router.get('/', noticeController.getAll);

export default router;

