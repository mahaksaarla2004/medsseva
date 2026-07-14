import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();

export const createReport = async (req: Request, res: Response) => {
  try {
    const { bookingId, testName, clinicalNotes, parameters } = req.body;

    const report = await prisma.report.create({
      data: {
        bookingId,
        testName,
        clinicalNotes,
        status: 'DRAFT',
        parameters: {
          create: parameters.map((p: any) => ({
            parameterId: p.parameterId || undefined,
            parameterName: p.parameterName,
            observedValue: p.observedValue,
            unit: p.unit,
            referenceRange: p.referenceRange,
            isAbnormal: p.isAbnormal || false,
          }))
        }
      },
      include: { parameters: true }
    });

    res.status(201).json(report);
  } catch (error: any) {
    console.error('Failed to create report:', error);
    res.status(500).json({ error: 'Failed to create report', details: error.message });
  }
};

export const verifyReport = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Ensure the user role is PATHOLOGIST or ADMIN, which is already handled by middleware, but we need their ID.
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized: User not found in request' });
    }

    const report = await prisma.report.update({
      where: { id },
      data: {
        status: 'RELEASED',
        verifiedById: req.user.id,
        verifiedAt: new Date()
      }
    });

    res.json(report);
  } catch (error: any) {
    console.error('Failed to verify report:', error);
    res.status(500).json({ error: 'Failed to verify report', details: error.message });
  }
};

export const getMyReports = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const reports = await prisma.report.findMany({
      where: {
        booking: {
          userId: req.user.id
        }
      },
      include: {
        parameters: true,
        booking: true
      },
      orderBy: { reportedDate: 'desc' }
    });

    res.json(reports);
  } catch (error: any) {
    console.error('Failed to fetch reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports', details: error.message });
  }
};
