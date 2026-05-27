"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const packageController_1 = require("../controllers/packageController");
const router = (0, express_1.Router)();
router.get('/', packageController_1.getAllPackages);
router.post('/', packageController_1.createPackage);
exports.default = router;
