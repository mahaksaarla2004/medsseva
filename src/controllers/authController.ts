import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-medsseva-key';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, mobile, password } = req.body;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { mobile },
          { email: email || undefined }
        ]
      }
    });

if (existingUser) {
      if (existingUser.mobile === mobile) {
        return res.status(400).json({ error: 'Mobile number already registered. Please login instead.' });
      }
      return res.status(400).json({ error: 'Email already in use. Try a different email.' });
    }

const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const user = await prisma.user.create({
      data: {
        name,
        email: email || undefined,
        mobile,
        password: hashedPassword
      }
    });
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      message: 'Registration successful',
      user: { id: user.id, name: user.name, mobile: user.mobile, email: user.email, role: user.role },
      token
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register', details: error.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { mobile, email, password } = req.body;
    console.log(`🔑 Login Attempt: Mobile/Email=${mobile || email}`);

let user = null;
    if (mobile) {
      user = await prisma.user.findUnique({ where: { mobile } });
    } else if (email) {
      user = await prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
   let isNewUser = false;

    if (mobile && !user) {
      console.log(`✨ New User Detected! Auto-registering mobile=${mobile}...`);
      const hashedPassword = await bcrypt.hash(password, 10);
      user = await prisma.user.create({
        data: {
          name: `User ${mobile.slice(-4)}`,
          email: `${mobile}@medsseva.com`,
          mobile,
          password: hashedPassword
        }
      });
      isNewUser = true;
    } else {
      if (!user.password) {
        console.log('❌ User has no password set');
        return res.status(401).json({ error: 'Invalid mobile number or password' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        console.log('❌ Password mismatch');
        return res.status(401).json({ error: 'Invalid mobile number or password' });
      }
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });

    res.json({
      message: isNewUser ? 'Auto-registration & Login successful' : 'Login successful',
      user: { id: user.id, name: user.name, mobile: user.mobile, email: user.email, role: user.role },
      token,
      isNewUser
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login', details: error.message });
  }
};

export const checkMobile = async (req: Request, res: Response) => {
  try {
    const { mobile } = req.query;

    if (!mobile || typeof mobile !== 'string') {
      return res.status(400).json({ error: 'Mobile number is required' });
    }

    const user = await prisma.user.findUnique({ where: { mobile } });

    if (user) {
      // OTP already verified identity — issue a session token directly
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
      return res.json({
        exists: true,
        user: { id: user.id, name: user.name, mobile: user.mobile, email: user.email, role: user.role },
        token
      });
    }

    return res.json({ exists: false });
  } catch (error: any) {
    console.error('Check mobile error:', error);
    res.status(500).json({ error: 'Failed to check mobile number', details: error.message });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        familyMembers: true
      }
    });
    res.json(users);
  } catch (error: any) {
    console.error('Error fetching registered users:', error);
    res.status(500).json({ error: 'Failed to fetch registered users', details: error.message });
  }
};
