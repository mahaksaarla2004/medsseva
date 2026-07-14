import { Router } from 'express';
import { getAllBookings, createBooking, updateBookingStatus, createRazorpayOrder, updatePaymentStatus, assignExecutive } from '../controllers/bookingController';
import { authenticate, authorizeRoles } from '../middlewares/authMiddleware';
import { strictLimiter } from '../middlewares/rateLimiter';
import { validateRequest } from '../middlewares/validateRequest';
import { createBookingSchema } from '../validators/schemas';

const router = Router();

router.get('/', authenticate, getAllBookings);
router.post('/', strictLimiter, authenticate, validateRequest(createBookingSchema), createBooking);
router.patch('/:id/status', authenticate, authorizeRoles('ADMIN'), updateBookingStatus);
// Payment: ADMIN for lab, ADMIN or EXECUTIVE for home (controller handles the distinction)
router.patch('/:id/payment', authenticate, authorizeRoles('ADMIN', 'EXECUTIVE'), updatePaymentStatus);

// Assign executive: ADMIN only
router.patch('/:id/assign-executive', authenticate, authorizeRoles('ADMIN'), assignExecutive);
router.post('/razorpay/create-order', strictLimiter, createRazorpayOrder);

export default router;
