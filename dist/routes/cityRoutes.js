"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cityController_1 = require("../controllers/cityController");
const router = (0, express_1.Router)();
router.get('/', cityController_1.getAllCities);
router.post('/', cityController_1.addCity);
exports.default = router;
