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

    // Load RBAC permissions if admin user
    let permissions: string[] = [];
    let adminRoleName: string | null = null;
    let adminRoleSlug: string | null = null;
    let accessibleModules: string[] = [];

    const adminUser = await prisma.adminUser.findUnique({
      where: { userId: user.id },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

  if (adminUser && adminUser.isActive) {
      permissions = adminUser.role.permissions.map(
        (rp) => `${rp.permission.module}.${rp.permission.action}`
      );
      adminRoleName = adminUser.role.name;
      adminRoleSlug = adminUser.role.slug;
      accessibleModules = [
        ...new Set(
          adminUser.role.permissions
            .filter((rp) => rp.permission.action === 'view')
            .map((rp) => rp.permission.module)
        ),
      ];
    } else if (user.role === 'SUPER_ADMIN') {
      adminRoleName = 'Super Admin';
      adminRoleSlug = 'super_admin';
      permissions = ['*'];
      accessibleModules = ['*'];
    }

    res.json({
      message: isNewUser ? 'Auto-registration & Login successful' : 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        role: user.role,
        adminRole: adminRoleName,
        adminRoleSlug,
        permissions,
        accessibleModules,
      },
      token,
      isNewUser,
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

export const createAdminUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password, roleId, franchiseId, department } = req.body;

    if (!name || !email || !password || !roleId) {
      return res.status(400).json({ error: 'name, email, password, roleId are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const role = await prisma.adminRole.findUnique({ where: { id: roleId } });
    if (!role) {
      return res.status(400).json({ error: 'Role not found' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const prismaRole = role.slug.toUpperCase().replace(/ /g, '_') as any;
    const validRoles = ['ADMIN', 'FRANCHISE', 'LAB_DEPARTMENT', 'EXECUTIVE', 'PATHOLOGIST'];
    const userRole = validRoles.includes(prismaRole) ? prismaRole : 'ADMIN';

const mobile = req.body.mobile?.trim() || `adm_${Date.now()}`;

    const existingMobile = req.body.mobile
      ? await prisma.user.findUnique({ where: { mobile } })
      : null;
    if (existingMobile) {
      return res.status(400).json({ error: 'Mobile number already in use' });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        mobile,
        password: hashedPassword,
        role: userRole,
      },
    });

    const adminUser = await prisma.adminUser.create({
      data: {
        userId: user.id,
        roleId,
        franchiseId: franchiseId || null,
        department: department || null,
        isActive: true,
      },
      include: {
        role: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    res.status(201).json(adminUser);
  } catch (error: any) {
    console.error('Create admin user error:', error);
    res.status(500).json({ error: 'Failed to create admin user', details: error.message });
  }
};

export const getAdminUsers = async (req: Request, res: Response) => {
  try {
    const adminUsers = await prisma.adminUser.findMany({
      include: {
        role: true,
        user: { select: { id: true, name: true, email: true, mobile: true, role: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(adminUsers);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch admin users', details: error.message });
  }
};

export const updateAdminUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, email, password, roleId, franchiseId, department, isActive } = req.body;

    const adminUser = await prisma.adminUser.findUnique({
      where: { id },
      include: { user: true, role: true },
    });
    if (!adminUser) return res.status(404).json({ error: 'Admin user not found' });

    if (adminUser.role.slug === 'super_admin') {
      return res.status(403).json({ error: 'Cannot modify Super Admin account' });
    }

    const userUpdateData: any = {};
    if (name) userUpdateData.name = name;
    if (email) userUpdateData.email = email;
    if (password) userUpdateData.password = await bcrypt.hash(password, 10);

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({ where: { id: adminUser.userId }, data: userUpdateData });
    }

    const adminUpdateData: any = {};
    if (roleId) adminUpdateData.roleId = roleId;
    if (franchiseId !== undefined) adminUpdateData.franchiseId = franchiseId;
    if (department !== undefined) adminUpdateData.department = department;
    if (isActive !== undefined) adminUpdateData.isActive = isActive;

    const updated = await prisma.adminUser.update({
      where: { id },
      data: adminUpdateData,
      include: {
        role: true,
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update admin user', details: error.message });
  }
};

export const deleteAdminUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const adminUser = await prisma.adminUser.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!adminUser) return res.status(404).json({ error: 'Admin user not found' });

    if (adminUser.role.slug === 'super_admin') {
      return res.status(403).json({ error: 'Cannot delete Super Admin account' });
    }

    await prisma.adminUser.delete({ where: { id } });
    await prisma.user.delete({ where: { id: adminUser.userId } });

 res.json({ message: 'Admin user deleted' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete admin user', details: error.message });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      include: { familyMembers: true },
    });
    res.json(users);
  } catch (error: any) {
    console.error('Error fetching registered users:', error);
    res.status(500).json({ error: 'Failed to fetch registered users', details: error.message });
  }
};