import { Router } from 'express';
import { getAllBookings, createBooking, updateBookingStatus, createRazorpayOrder, updatePaymentStatus } from '../controllers/bookingController';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware';
import { strictLimiter } from '../middlewares/rateLimiter';
import { validateRequest } from '../middlewares/validateRequest';
import { createBookingSchema } from '../validators/schemas';

const router = Router();

router.get('/', authenticate, getAllBookings);
router.post('/', strictLimiter, validateRequest(createBookingSchema), createBooking);
router.patch('/:id/status', authenticate, authorizeRoles('ADMIN'), updateBookingStatus);
router.patch('/:id/payment', authenticate, authorizeRoles('ADMIN'), updatePaymentStatus);
router.post('/razorpay/create-order', strictLimiter, createRazorpayOrder);

export default router;
