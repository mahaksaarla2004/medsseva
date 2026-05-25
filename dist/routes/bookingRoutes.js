"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bookingController_1 = require("../controllers/bookingController");
const router = (0, express_1.Router)();
router.get('/', bookingController_1.getAllBookings);
router.post('/', bookingController_1.createBooking);
router.patch('/:id/status', bookingController_1.updateBookingStatus);
exports.default = router;
