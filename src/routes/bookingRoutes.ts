import { Router } from 'express';
import { getAllBookings, createBooking, updateBookingStatus, createRazorpayOrder } from '../controllers/bookingController';

const router = Router();

router.get('/', getAllBookings);
router.post('/', createBooking);
router.patch('/:id/status', updateBookingStatus);
router.post('/razorpay/create-order', createRazorpayOrder);

export default router;
