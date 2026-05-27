"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removePaymentMethod = exports.addPaymentMethod = exports.getPaymentMethods = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getPaymentMethods = async (req, res) => {
    try {
        const { mobile } = req.query;
        if (!mobile) {
            return res.status(400).json({ error: 'Mobile is required' });
        }
        const user = await prisma.user.findUnique({ where: { mobile: String(mobile) } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const methods = await prisma.paymentMethod.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        });
        res.json(methods);
    }
    catch (error) {
        console.error('Error fetching payment methods:', error);
        res.status(500).json({ error: 'Failed to fetch payment methods', details: error.message });
    }
};
exports.getPaymentMethods = getPaymentMethods;
const addPaymentMethod = async (req, res) => {
    try {
        const { mobile, bank, last4, holder, expiry, type } = req.body;
        if (!mobile || !bank || !last4 || !holder || !expiry) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const user = await prisma.user.findUnique({ where: { mobile: String(mobile) } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const method = await prisma.paymentMethod.create({
            data: {
                userId: user.id,
                bank,
                last4,
                holder,
                expiry,
                type: type || 'blue'
            }
        });
        res.status(201).json(method);
    }
    catch (error) {
        console.error('Error adding payment method:', error);
        res.status(500).json({ error: 'Failed to add payment method', details: error.message });
    }
};
exports.addPaymentMethod = addPaymentMethod;
const removePaymentMethod = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.paymentMethod.delete({ where: { id } });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error removing payment method:', error);
        res.status(500).json({ error: 'Failed to remove payment method', details: error.message });
    }
};
exports.removePaymentMethod = removePaymentMethod;
