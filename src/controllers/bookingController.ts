import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Razorpay from 'razorpay';
import crypto from 'crypto';

const prisma = new PrismaClient();

let razorpay: any;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

export const getAllBookings = async (req: any, res: Response) => {
  try {
    const { mobile, id } = req.query;
    const where: any = {};
    
// Scoped visibility per role
    if (req.user.role === 'EXECUTIVE') {
      // Executive sees only their assigned HOME bookings
      where.assignedExecutiveId = req.user.id;
      where.collectionMode = 'HOME';
    } else if (req.user.role !== 'ADMIN' && req.user.role !== 'PATHOLOGIST') {
      // Regular USER sees only their own bookings
      where.userId = req.user.id;
    } else {
      // ADMIN / PATHOLOGIST see all, with optional mobile filter
      if (mobile) {
        where.user = { mobile: String(mobile) };
      }
    }
    if (id) {
      where.id = String(id);
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        user: true,
        tests: {
          include: { test: true }
        },
        packages: {
          include: { package: true }
        },
        report: {
          include: { parameters: true }
        }
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const bookingsWithAddress = await Promise.all(bookings.map(async (b) => {
      const address = await prisma.address.findUnique({
        where: { id: b.addressId }
      });
      return {
        ...b,
        address
      };
    }));

    res.json(bookingsWithAddress);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

export const createRazorpayOrder = async (req: Request, res: Response) => {
  try {
    if (!razorpay) {
      throw new Error('Razorpay is not configured. Missing API keys in environment variables.');
    }
    const { amount } = req.body;

    const options = {
      amount: Math.round(Number(amount) * 100), // convert to paise
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error: any) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ error: 'Failed to create Razorpay order', details: error.message });
  }
};

export const createBooking = async (req: any, res: Response) => {
  try {
  const { 
      tests,
      scheduledDate, 
      scheduledSlot, 
      totalPaid, 
      patientName, 
      mobile, 
      addressId,
      collectionMode,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      paymentMethod
  } = req.body;

  const safeTests = Array.isArray(tests) ? tests : [];
    const safeCollectionMode = collectionMode === 'lab' ? 'LAB' : 'HOME';
    console.log('📦 Received Booking Payload:', req.body);

    // Verify Payment Signature for Online Payments
    if (razorpay_payment_id && razorpay_order_id && razorpay_signature) {
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ error: 'Invalid payment signature' });
      }
    }

// 1. Use authenticated user directly — prevents IDOR
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });
    if (!user) {
      return res.status(401).json({ error: 'Authenticated user not found' });
    }

    // 1.5 Create fallback category if not exists
    await prisma.testCategory.upsert({
      where: { id: 'general' },
      update: {},
      create: { id: 'general', name: 'General', iconName: 'activity' }
    });

    // 1.6 Upsert tests from frontend payload so relations work
  for (const item of safeTests) {
      if (item.testId || item.id) {
        const tId = item.testId || item.id;
        await prisma.test.upsert({
          where: { id: tId },
          update: { 
            name: item.name, 
            price: Number(item.price) || 0, 
            discountedPrice: Number(item.discountedPrice) || Number(item.price) || 0 
          },
          create: {
            id: tId,
            name: item.name || 'Unknown Test',
            description: item.name || 'Auto-created test',
            price: Number(item.price) || 0,
            discountedPrice: Number(item.discountedPrice) || Number(item.price) || 0,
            categoryId: 'general',
            reportTime: '24 Hours',
            fastingRequired: false,
          }
        });
      }
    }

  // 2. Fetch User's Default Address if none provided
    let finalAddressId = addressId;
    if (collectionMode === 'lab' || addressId === 'LAB_WALKIN') {
      const centerAddr = await prisma.address.findFirst({
        where: { userId: user.id, type: 'CENTER' }
      }) || await prisma.address.create({
        data: {
          userId: user.id,
          type: 'CENTER',
          line1: 'MedsSeva Hub - Central Plaza',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        }
      });
      finalAddressId = centerAddr.id;
    } else if (!finalAddressId) {
      const defaultAddr = await prisma.address.findFirst({
        where: { userId: user.id },
        orderBy: { isDefault: 'desc' }
      });
      if (defaultAddr) {
        finalAddressId = defaultAddr.id;
} else {
        return res.status(400).json({ error: 'No address found for this user. Please add an address before booking.' });
      }
    }
    
// 3. Parse date safely
    let parsedDate = new Date(scheduledDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'Invalid booking date provided.' });
    }

    // 3.5 Date/Time validation — reject past dates and expired slots
    const now = new Date();

    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const bookingMidnight = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());

    if (bookingMidnight < todayMidnight) {
      return res.status(400).json({ error: 'Booking date cannot be in the past.' });
    }

    if (bookingMidnight.getTime() === todayMidnight.getTime() && scheduledSlot) {
      // Parse slot end time e.g. "03:00 PM - 04:00 PM" → end = "04:00 PM"
      const slotEndPart = scheduledSlot.split(' - ')[1];
      if (slotEndPart) {
        const [timePart, meridiem] = slotEndPart.trim().split(' ');
        const [hourStr, minuteStr] = timePart.split(':');
        let hour = parseInt(hourStr, 10);
        const minute = parseInt(minuteStr, 10);
        if (meridiem === 'PM' && hour !== 12) hour += 12;
        if (meridiem === 'AM' && hour === 12) hour = 0;

        const slotEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
        if (slotEnd <= now) {
          return res.status(400).json({ error: 'This time slot has already passed. Please select another slot.' });
        }
      }
    }

// 4. Create booking
    const booking = await prisma.booking.create({
      data: {
        userId: user.id,
        scheduledDate: parsedDate,
        scheduledSlot: scheduledSlot || 'Anytime',
        totalPaid: Number(totalPaid) || 0,
        patientName: patientName || 'Guest',
        status: razorpay_payment_id ? 'CONFIRMED' : 'PENDING',
        paymentStatus: razorpay_payment_id ? 'SUCCESS' : 'PENDING',
        collectionMode: safeCollectionMode as any,
        addressId: finalAddressId,
        paymentId: razorpay_payment_id || undefined,
        razorpayOrderId: razorpay_order_id || undefined,
        tests: {
          create: safeTests.map((item: any) => ({
            testId: item.testId || item.id
          }))
        }
      },
      include: {
        tests: true
      }
    });
    console.log('✅ Booking Created Successfully:', booking.id);
    res.status(201).json(booking);
  } catch (error: any) {
    console.error('❌ CRITICAL ERROR creating booking:', error);
    res.status(500).json({ 
      error: 'Failed to create booking', 
      details: error.message 
    });
  }
};

export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Ensure status matches Prisma enum (uppercase)
    const upperStatus = status ? status.toUpperCase() : undefined;

    const booking = await prisma.booking.update({
      where: { id },
      data: { status: upperStatus },
    });
    
    res.json(booking);
  } catch (error: any) {
    console.error('Failed to update booking status:', error);
    res.status(500).json({ error: 'Failed to update status', details: error.message });
  }
};

export const updatePaymentStatus = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentMode } = req.body;

    if (!paymentStatus) {
      return res.status(400).json({ error: 'paymentStatus is required.' });
    }

    const upperStatus = paymentStatus.toUpperCase();
    const validStatuses = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'];
    if (!validStatuses.includes(upperStatus)) {
      return res.status(400).json({ error: `Invalid paymentStatus. Must be one of: ${validStatuses.join(', ')}` });
    }

    // Fetch booking to check collectionMode and current state
    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Prevent duplicate payment marking
    if (booking.paymentStatus === 'SUCCESS') {
      return res.status(400).json({ error: 'Payment has already been marked as received for this booking.' });
    }

    const actorRole = req.user.role;
    const actorId = req.user.id;

    // Role-based permission check
    if (booking.collectionMode === 'LAB') {
      // Only ADMIN or PATHOLOGIST can mark payment for lab visit
      if (!['ADMIN', 'PATHOLOGIST'].includes(actorRole)) {
        return res.status(403).json({ error: 'Only Pathology Admin can mark payment received for Lab Visit bookings.' });
      }
    } else if (booking.collectionMode === 'HOME') {
      // Only assigned EXECUTIVE or ADMIN can mark payment for home collection
      const isAssignedExecutive = actorRole === 'EXECUTIVE' && booking.assignedExecutiveId === actorId;
      const isAdmin = actorRole === 'ADMIN';
      if (!isAssignedExecutive && !isAdmin) {
        return res.status(403).json({ error: 'Only the assigned Collection Executive or Admin can mark payment for Home Collection bookings.' });
      }
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        paymentStatus: upperStatus as any,
        paymentMode: paymentMode ? paymentMode.toUpperCase() as any : undefined,
        paymentReceivedAt: upperStatus === 'SUCCESS' ? new Date() : undefined,
        paymentReceivedById: upperStatus === 'SUCCESS' ? actorId : undefined,
        // Auto-confirm booking when payment received
        status: upperStatus === 'SUCCESS' ? 'CONFIRMED' : undefined,
      },
    });

    console.log(`✅ Payment marked ${upperStatus} for booking ${id} by ${actorRole} ${actorId}`);
    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update payment status:', error);
    res.status(500).json({ error: 'Failed to update payment status', details: error.message });
  }
};

export const assignExecutive = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { executiveId } = req.body;

    if (!executiveId) {
      return res.status(400).json({ error: 'executiveId is required.' });
    }

    // Only ADMIN can assign
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only Admin can assign executives.' });
    }

    const executive = await prisma.user.findUnique({ where: { id: executiveId } });
    if (!executive || executive.role !== 'EXECUTIVE') {
      return res.status(400).json({ error: 'Provided user is not a valid Executive.' });
    }

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.collectionMode !== 'HOME') {
      return res.status(400).json({ error: 'Executives can only be assigned to Home Collection bookings.' });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { assignedExecutiveId: executiveId },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Failed to assign executive:', error);
    res.status(500).json({ error: 'Failed to assign executive', details: error.message });
  }
};
