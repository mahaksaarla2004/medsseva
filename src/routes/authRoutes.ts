import { Router } from 'express';
import { register, login, getAllUsers, checkMobile } from '../controllers/authController';

const router = Router();

router.get('/check-mobile', checkMobile);
router.post('/register', register);
router.post('/login', login);
router.get('/users', getAllUsers);

export default router;
