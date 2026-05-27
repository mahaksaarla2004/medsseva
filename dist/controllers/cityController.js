"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCity = exports.getAllCities = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getAllCities = async (req, res) => {
    try {
        const cities = await prisma.city.findMany({
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
        });
        res.json(cities);
    }
    catch (error) {
        console.error('Error fetching cities:', error);
        res.status(500).json({ error: 'Failed to fetch cities', details: error.message });
    }
};
exports.getAllCities = getAllCities;
const addCity = async (req, res) => {
    try {
        const { name, icon, isActive } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'City name is required' });
        }
        const city = await prisma.city.create({
            data: {
                name,
                icon: icon || 'city',
                isActive: isActive !== undefined ? isActive : true,
            }
        });
        res.status(201).json(city);
    }
    catch (error) {
        console.error('Error adding city:', error);
        res.status(500).json({ error: 'Failed to add city', details: error.message });
    }
};
exports.addCity = addCity;
