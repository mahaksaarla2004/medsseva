"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const addressController_1 = require("../controllers/addressController");
const router = (0, express_1.Router)();
router.get('/', addressController_1.getAddresses);
router.post('/', addressController_1.addAddress);
router.delete('/:id', addressController_1.deleteAddress);
exports.default = router;
