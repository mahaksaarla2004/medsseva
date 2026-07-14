import { Router } from 'express';
import { getAllTests, createTest, addTestParameter, getTestParameters, getTestById } from '../controllers/testController';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', getAllTests);
router.post('/', authenticate, authorizeRoles('ADMIN'), createTest);

router.get('/:id', getTestById);

router.get('/:testId/parameters', getTestParameters);
router.post('/:testId/parameters', authenticate, authorizeRoles('ADMIN', 'PATHOLOGIST'), addTestParameter);

export default router;
