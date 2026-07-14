import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getAllTests = async (req: Request, res: Response) => {
  try {
    const tests = await prisma.test.findMany({
      include: {
        category: true,
        parameters: true,
      },
    });
    res.json(tests);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch tests', details: error.message });
  }
};

export const getTestById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const test = await prisma.test.findUnique({
      where: { id },
      include: {
        category: true,
        parameters: true,
      },
    });
    if (!test) {
      return res.status(404).json({ error: 'Test not found' });
    }
    res.json(test);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch test', details: error.message });
  }
};

export const createTest = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Failed to create test:', error);
    res.status(500).json({ error: 'Failed to create test', details: error.message });
  }
};

// Test Parameters
export const addTestParameter = async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const { name, unit, referenceRanges } = req.body;

    const parameter = await prisma.testParameter.create({
      data: {
        testId,
        name,
        unit,
        referenceRanges,
      }
    });
    res.status(201).json(parameter);
  } catch (error: any) {
    console.error('Failed to add parameter:', error);
    res.status(500).json({ error: 'Failed to add parameter', details: error.message });
  }
};

export const getTestParameters = async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const parameters = await prisma.testParameter.findMany({
      where: { testId },
    });
    res.json(parameters);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch parameters', details: error.message });
  }
};
