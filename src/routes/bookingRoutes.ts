import { Router } from 'express';
import { getAllBookings, createBooking, updateBookingStatus } from '../controllers/bookingController';

const router = Router();

router.get('/', getAllBookings);
router.post('/', createBooking);
router.patch('/:id/status', updateBookingStatus);

export default router;
