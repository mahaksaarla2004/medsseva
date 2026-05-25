"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBookingStatus = exports.createBooking = exports.getAllBookings = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getAllBookings = async (req, res) => {
    try {
        const { mobile, id } = req.query;
        const where = {};
        if (mobile) {
            where.user = { mobile: String(mobile) };
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
    }
    catch (error) {
        console.error('Error fetching bookings:', error);
        res.status(500).json({ error: 'Failed to fetch bookings' });
    }
};
exports.getAllBookings = getAllBookings;
const createBooking = async (req, res) => {
    try {
        const { tests = [], scheduledDate, scheduledSlot, totalPaid, patientName, mobile, addressId } = req.body;
        console.log('📦 Received Booking Payload:', req.body);
        // 1. Find or create user
        const user = await prisma.user.upsert({
            where: { mobile },
            update: { name: patientName },
            create: {
                mobile,
                name: patientName,
            },
        });
        // 1.5 Create fallback category if not exists
        await prisma.testCategory.upsert({
            where: { id: 'general' },
            update: {},
            create: { id: 'general', name: 'General', iconName: 'activity' }
        });
        // 1.6 Upsert tests from frontend payload so relations work
        for (const item of tests) {
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
        if (addressId === 'LAB_WALKIN') {
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
        }
        else if (!finalAddressId) {
            const defaultAddr = await prisma.address.findFirst({
                where: { userId: user.id },
                orderBy: { isDefault: 'desc' }
            });
            if (defaultAddr) {
                finalAddressId = defaultAddr.id;
            }
            else {
                // Create a dummy fallback if no address exists to prevent crash
                const dummy = await prisma.address.create({
                    data: {
                        userId: user.id,
                        type: 'Home',
                        line1: 'No Address Provided',
                        city: 'Unknown',
                        state: 'Unknown',
                        pincode: '000000',
                        isDefault: true
                    }
                });
                finalAddressId = dummy.id;
            }
        }
        // 3. Parse date safely
        let parsedDate = new Date(scheduledDate);
        if (isNaN(parsedDate.getTime())) {
            // Fallback for common formats
            parsedDate = new Date();
            console.warn('⚠️ Invalid date received, falling back to current date');
        }
        // 4. Create booking
        const booking = await prisma.booking.create({
            data: {
                userId: user.id,
                scheduledDate: parsedDate,
                scheduledSlot: scheduledSlot || 'Anytime',
                totalPaid: Number(totalPaid) || 0,
                patientName: patientName || 'Guest',
                status: 'PENDING',
                addressId: finalAddressId,
                tests: {
                    create: tests.map((item) => ({
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
    }
    catch (error) {
        console.error('❌ CRITICAL ERROR creating booking:', error);
        res.status(500).json({
            error: 'Failed to create booking',
            details: error.message
        });
    }
};
exports.createBooking = createBooking;
const updateBookingStatus = async (req, res) => {
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
    }
    catch (error) {
        console.error('Failed to update booking status:', error);
        res.status(500).json({ error: 'Failed to update status', details: error.message });
    }
};
exports.updateBookingStatus = updateBookingStatus;
