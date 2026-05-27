"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const bookingRoutes_1 = __importDefault(require("./routes/bookingRoutes"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const addressRoutes_1 = __importDefault(require("./routes/addressRoutes"));
const testRoutes_1 = __importDefault(require("./routes/testRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const cityRoutes_1 = __importDefault(require("./routes/cityRoutes"));
const paymentMethodRoutes_1 = __importDefault(require("./routes/paymentMethodRoutes"));
const packageRoutes_1 = __importDefault(require("./routes/packageRoutes"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/api/categories', categoryRoutes_1.default);
app.use('/api/bookings', bookingRoutes_1.default);
app.use('/api/auth', authRoutes_1.default);
app.use('/api/addresses', addressRoutes_1.default);
app.use('/api/tests', testRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/cities', cityRoutes_1.default);
app.use('/api/payment-methods', paymentMethodRoutes_1.default);
app.use('/api/packages', packageRoutes_1.default);
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});
exports.default = app;
