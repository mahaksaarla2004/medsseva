import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();

// Utility to generate a random 8-digit UHID (e.g., 9482-1029)
const generateUHID = () => {
  const part1 = Math.floor(1000 + Math.random() * 9000);
  const part2 = Math.floor(1000 + Math.random() * 9000);
  return `${part1}-${part2}`;
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: { familyMembers: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Auto-generate UHID if it doesn't exist
    if (!user.uhid) {
      let unique = false;
      let newUhid = generateUHID();
      while (!unique) {
        const existing = await prisma.user.findUnique({ where: { uhid: newUhid } });
        if (!existing) unique = true;
        else newUhid = generateUHID();
      }
      user = await prisma.user.update({
        where: { id: userId },
        data: { uhid: newUhid },
        include: { familyMembers: true }
      });
    }

    res.json(user);
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile', details: error.message });
  }
};

export const addFamilyMember = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, relation, age, gender } = req.body;

    if (!name || !relation || !age || !gender) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const familyMember = await prisma.family.create({
      data: {
        userId,
        name,
        relation,
        age: parseInt(age),
        gender
      }
    });

    res.status(201).json(familyMember);
  } catch (error: any) {
    console.error('Error adding family member:', error);
    res.status(500).json({ error: 'Failed to add family member', details: error.message });
  }
};

export const removeFamilyMember = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;

    // Ensure the family member belongs to the user before deleting
    const familyMember = await prisma.family.findUnique({ where: { id } });
    if (!familyMember || familyMember.userId !== userId) {
      return res.status(404).json({ error: 'Family member not found' });
    }

    await prisma.family.delete({ where: { id } });

    res.json({ success: true, message: 'Family member removed' });
  } catch (error: any) {
    console.error('Error removing family member:', error);
    res.status(500).json({ error: 'Failed to remove family member', details: error.message });
  }
};
