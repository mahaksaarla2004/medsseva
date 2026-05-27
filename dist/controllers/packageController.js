"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPackage = exports.getAllPackages = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const getAllPackages = async (req, res) => {
    try {
        const packages = await prisma.healthPackage.findMany({
            include: {
                testsIncluded: {
                    include: {
                        test: true
                    }
                }
            },
        });
        res.json(packages);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch packages', details: error.message });
    }
};
exports.getAllPackages = getAllPackages;
const createPackage = async (req, res) => {
    try {
        const { id, name, subtitle, category, categoryId, description, price, oldPrice, discount, parametersCount, badge, testsIncluded, preparation, isActive } = req.body;
        const healthPackage = await prisma.healthPackage.create({
            data: {
                id,
                name,
                subtitle: subtitle || '',
                category: category || 'General',
                categoryId: categoryId || 'general',
                description: description || '',
                price: Number(price),
                oldPrice: Number(oldPrice),
                discount: discount || '',
                parametersCount: Number(parametersCount),
                badge: badge || '',
                preparation: preparation || '',
                isActive: isActive !== undefined ? !!isActive : true,
            },
        });
        if (testsIncluded && Array.isArray(testsIncluded)) {
            // Assuming testsIncluded is an array of test IDs
            const packageTests = testsIncluded.map(testId => ({
                packageId: healthPackage.id,
                testId: testId,
            }));
            await prisma.packageTest.createMany({
                data: packageTests,
                skipDuplicates: true
            });
        }
        const createdPackage = await prisma.healthPackage.findUnique({
            where: { id: healthPackage.id },
            include: {
                testsIncluded: {
                    include: {
                        test: true
                    }
                }
            }
        });
        res.status(201).json(createdPackage);
    }
    catch (error) {
        console.error('Failed to create package:', error);
        res.status(500).json({ error: 'Failed to create package', details: error.message });
    }
};
exports.createPackage = createPackage;
