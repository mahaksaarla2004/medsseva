import express from 'express';
import cors from 'cors';
import categoryRoutes from './routes/categoryRoutes';
import bookingRoutes from './routes/bookingRoutes';
import authRoutes from './routes/authRoutes';
import addressRoutes from './routes/addressRoutes';
import testRoutes from './routes/testRoutes';
import userRoutes from './routes/userRoutes';
import cityRoutes from './routes/cityRoutes';
import paymentMethodRoutes from './routes/paymentMethodRoutes';
import packageRoutes from './routes/packageRoutes';
import reportRoutes from './routes/reportRoutes';
import roleRoutes from './routes/roleRoutes';
import adminUserRoutes from './routes/adminUserRoutes';
import branchRoutes from './routes/branchRoutes';
import { globalLimiter } from './middlewares/rateLimiter';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

app.use(cors());
app.use(express.json());

// Global Rate Limiting
app.use('/api', globalLimiter);

// Routes
app.use('/api/categories', categoryRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cities', cityRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/packages', packageRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/admin-users', adminUserRoutes);
app.use('/api/branches', branchRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Global Error Handler
app.use(errorHandler);

export default app;
