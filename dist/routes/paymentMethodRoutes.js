"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentMethodController_1 = require("../controllers/paymentMethodController");
const router = (0, express_1.Router)();
router.get('/', paymentMethodController_1.getPaymentMethods);
router.post('/', paymentMethodController_1.addPaymentMethod);
router.delete('/:id', paymentMethodController_1.removePaymentMethod);
exports.default = router;
