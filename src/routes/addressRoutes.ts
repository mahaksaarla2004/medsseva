import { Router } from 'express';
import { getAddresses, addAddress } from '../controllers/addressController';

const router = Router();

router.get('/', getAddresses);
router.post('/', addAddress);

export default router;
