import { Router } from 'express';
import { bannerController } from '../controllers/bannerController';

const router = Router();

router.get('/', bannerController.getAll);

export default router;

