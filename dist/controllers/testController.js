"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTest = exports.getAllTests = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getAllTests = async (req, res) => {
    try {
        const tests = await prisma.test.findMany({
            include: {
                category: true,
            },
        });
        res.json(tests);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch tests', details: error.message });
    }
};
exports.getAllTests = getAllTests;
const createTest = async (req, res) => {
    try {
        const { id, name, description, price, discountedPrice, categoryId, reportTime, fastingRequired, homeCollection, whyRequired } = req.body;
        // Ensure category exists first
        const category = await prisma.testCategory.findUnique({
            where: { id: categoryId },
        });
        if (!category) {
            await prisma.testCategory.create({
                data: {
                    id: categoryId,
                    name: categoryId,
                    iconName: 'flask',
                },
            });
        }
        const test = await prisma.test.create({
            data: {
                id,
                name,
                description: description || '',
                price: Number(price),
                discountedPrice: discountedPrice ? Number(discountedPrice) : Number(price),
                categoryId,
                reportTime: reportTime || '24 Hours',
                fastingRequired: !!fastingRequired,
                homeCollection: homeCollection !== undefined ? !!homeCollection : true,
                whyRequired: whyRequired || '',
            },
        });
        res.status(201).json(test);
    }
    catch (error) {
        console.error('Failed to create test:', error);
        res.status(500).json({ error: 'Failed to create test', details: error.message });
    }
};
exports.createTest = createTest;
