import { Router } from 'express';
import { getMe, addFamilyMember, removeFamilyMember } from '../controllers/userController';
import { authenticate } from '../middlewares/authMiddleware';

const router = Router();

// All user routes require authentication
router.use(authenticate);

router.get('/me', getMe);
router.post('/family', addFamilyMember);
router.delete('/family/:id', removeFamilyMember);

export default router;
