import { Router } from 'express';
import { createReport, verifyReport, getMyReports } from '../controllers/reportController';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { createReportSchema } from '../validators/schemas';

const router = Router();

router.get('/my-reports', authenticate, getMyReports);
router.post('/', authenticate, authorizeRoles('ADMIN', 'PATHOLOGIST'), validateRequest(createReportSchema), createReport);
router.patch('/:id/verify', authenticate, authorizeRoles('ADMIN', 'PATHOLOGIST'), verifyReport);

export default router;
