import { Router } from 'express';
import { getAllTests, createTest } from '../controllers/testController';

const router = Router();

router.get('/', getAllTests);
router.post('/', createTest);

export default router;
