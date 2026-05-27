"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// All user routes require authentication
router.use(authMiddleware_1.authenticate);
router.get('/me', userController_1.getMe);
router.post('/family', userController_1.addFamilyMember);
router.delete('/family/:id', userController_1.removeFamilyMember);
exports.default = router;
