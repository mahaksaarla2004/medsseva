"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addAddress = exports.getAddresses = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getAddresses = async (req, res) => {
    try {
        const { mobile } = req.query; // Identifying user by mobile for now since we haven't implemented full JWT extraction in middleware
        if (!mobile) {
            return res.status(400).json({ error: 'Mobile number is required' });
        }
        const user = await prisma.user.findUnique({
            where: { mobile: mobile }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const addresses = await prisma.address.findMany({
            where: { userId: user.id }
        });
        res.json(addresses);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch addresses' });
    }
};
exports.getAddresses = getAddresses;
const addAddress = async (req, res) => {
    try {
        const { mobile, type, line1, line2, city, state, pincode, isDefault } = req.body;
        const user = await prisma.user.findUnique({
            where: { mobile: mobile }
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        // Unset default if this one is default
        if (isDefault) {
            await prisma.address.updateMany({
                where: { userId: user.id },
                data: { isDefault: false }
            });
        }
        const address = await prisma.address.create({
            data: {
                userId: user.id,
                type,
                line1,
                line2,
                city,
                state,
                pincode,
                isDefault
            }
        });
        res.status(201).json(address);
    }
    catch (error) {
        console.error('Error adding address:', error);
        res.status(500).json({ error: 'Failed to add address', details: error.message });
    }
};
exports.addAddress = addAddress;
