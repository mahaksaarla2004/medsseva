"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const testController_1 = require("../controllers/testController");
const router = (0, express_1.Router)();
router.get('/', testController_1.getAllTests);
router.post('/', testController_1.createTest);
exports.default = router;
