import { Router } from 'express';
import { getAllPackages, createPackage } from '../controllers/packageController';

const router = Router();

router.get('/', getAllPackages);
router.post('/', createPackage);

export default router;
