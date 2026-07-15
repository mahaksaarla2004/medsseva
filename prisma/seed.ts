import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

// 1. Clear existing data
  await prisma.bookingTest.deleteMany();
  await prisma.test.deleteMany();
  await prisma.testCategory.deleteMany();

  // 2. Create Categories
  const categories = await Promise.all([
    prisma.testCategory.create({
      data: { id: 'blood', name: 'Blood Tests', iconName: 'water' }
    }),
    prisma.testCategory.create({
      data: { id: 'thyroid', name: 'Thyroid', iconName: 'butterfly' }
    }),
    prisma.testCategory.create({
      data: { id: 'fullbody', name: 'Full Body', iconName: 'body' }
    }),
  ]);

  console.log('✅ Categories created');

  // 3. Create Tests
  await prisma.test.createMany({
    data: [
      {
        name: 'CBC (Complete Blood Count)',
        description: 'Comprehensive blood test to check overall health.',
        price: 499,
        discountedPrice: 299,
        categoryId: 'blood',
        reportTime: '12 Hours',
        fastingRequired: false,
        whyRequired: 'To detect infections, anemia, and other blood disorders.',
      },
      {
        name: 'Thyroid Profile (T3, T4, TSH)',
        description: 'Measures thyroid hormone levels in your blood.',
        price: 800,
        discountedPrice: 550,
        categoryId: 'thyroid',
        reportTime: '24 Hours',
        fastingRequired: true,
        whyRequired: 'To evaluate thyroid gland function.',
      },
      {
        name: 'Diabetes Screening (HbA1c)',
        description: 'Average blood sugar levels over the past 3 months.',
        price: 600,
        discountedPrice: 399,
        categoryId: 'blood',
        reportTime: '12 Hours',
        fastingRequired: false,
        whyRequired: 'To diagnose and monitor diabetes.',
      }
    ]
  });

console.log('✅ Tests created');

  // 4. Seed Admin User
  console.log('🔄 Starting RBAC seed...');
  const hashedPassword = await bcrypt.hash('admin@123', 10);
  console.log('🔄 Hashing done, seeding permissions...');
  const execPassword = await bcrypt.hash('exec@123', 10);

  // ─── Define all modules + actions ───────────────────────────────────────
  const MODULES = [
    'dashboard', 'users', 'patients', 'bookings', 'home_collection',
    'lab_tests', 'reports', 'payments', 'orders', 'franchise',
    'lab_department', 'staff', 'notifications', 'coupons', 'packages',
    'doctors', 'pathologies', 'support', 'settings', 'roles_permissions',
    'analytics', 'audit_logs', 'inventory', 'cms',
  ];
  const ACTIONS = ['view', 'create', 'edit', 'delete', 'export', 'approve', 'assign'];

// Seed all permissions
  const permData = MODULES.flatMap(module =>
    ACTIONS.map(action => ({ module, action, description: `${action} on ${module}` }))
  );

  await prisma.permission.createMany({
    data: permData,
    skipDuplicates: true,
  });
  console.log('✅ Permissions seeded');

// ─── Super Admin Role (all permissions) ─────────────────────────────────
  console.log('🔄 Creating Super Admin role...');
  const superAdminRole = await prisma.adminRole.upsert({
    where: { slug: 'super_admin' },
    update: {},
    create: { name: 'Super Admin', slug: 'super_admin', description: 'Full system access', isSystem: true },
  });
  console.log('🔄 Linking all permissions to Super Admin role...');

  const allPerms = await prisma.permission.findMany();
  await prisma.rolePermission.createMany({
    data: allPerms.map(p => ({ roleId: superAdminRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });
  console.log('✅ Super Admin role seeded with all permissions');

  // ─── Franchise Role ──────────────────────────────────────────────────────
  const franchiseRole = await prisma.adminRole.upsert({
    where: { slug: 'franchise' },
    update: {},
    create: { name: 'Franchise', slug: 'franchise', description: 'Franchise-level access', isSystem: true },
  });

const franchiseModules = ['dashboard', 'bookings', 'payments', 'reports', 'patients'];
  const franchiseActions = ['view', 'create'];
  const franchisePerms = await prisma.permission.findMany({
    where: { module: { in: franchiseModules }, action: { in: franchiseActions } }
  });
  await prisma.rolePermission.createMany({
    data: franchisePerms.map(p => ({ roleId: franchiseRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });
  // ─── Lab Department Role ─────────────────────────────────────────────────
  const labRole = await prisma.adminRole.upsert({
    where: { slug: 'lab_department' },
    update: {},
    create: { name: 'Lab Department', slug: 'lab_department', description: 'Lab-only access', isSystem: true },
  });

const labModules = ['dashboard', 'lab_tests', 'reports', 'samples', 'inventory'];
  const labPerms = await prisma.permission.findMany({
    where: { module: { in: labModules }, action: { in: ['view', 'create', 'edit', 'approve'] } }
  });
  await prisma.rolePermission.createMany({
    data: labPerms.map(p => ({ roleId: labRole.id, permissionId: p.id })),
    skipDuplicates: true,
  });
  console.log('✅ Franchise + Lab Department roles seeded');

  // ─── Seed Super Admin User ───────────────────────────────────────────────
  const superAdminUser = await prisma.user.upsert({
    where: { mobile: '0000000000' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@lms.com',
      mobile: '0000000000',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  });

  await prisma.adminUser.upsert({
    where: { userId: superAdminUser.id },
    update: {},
    create: { userId: superAdminUser.id, roleId: superAdminRole.id, isActive: true },
  });

  // ─── Seed Executive User ─────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { mobile: '9999999999' },
    update: {},
    create: {
      name: 'Test Executive',
      email: 'exec@lms.com',
      mobile: '9999999999',
      password: execPassword,
      role: 'EXECUTIVE',
    },
  });

  console.log('✅ Super Admin seeded — email: admin@lms.com / password: admin@123');
  console.log('✅ Executive seeded  — mobile: 9999999999  / password: exec@123');
 // ─── Seed Branches ───────────────────────────────────────────────────────
  const branchesData = [
    {
      name: 'MedSeva - Andheri West',
      code: 'MSV-AND-W',
      line1: 'Shop 12, Lokhandwala Complex, Andheri West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400053',
      latitude: 19.1359,
      longitude: 72.8313,
      contactNumber: '9876500001',
      email: 'andheri@medseva.in',
      workingHours: 'Mon–Sat: 7:00 AM – 8:00 PM',
      availableSlots: ['07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM'],
      homeCollection: true,
      labVisit: true,
      isActive: true,
    },
    {
      name: 'MedSeva - Thane West',
      code: 'MSV-THN-W',
      line1: '2nd Floor, Viviana Mall Road, Thane West',
      city: 'Thane',
      state: 'Maharashtra',
      pincode: '400601',
      latitude: 19.2183,
      longitude: 72.9781,
      contactNumber: '9876500002',
      email: 'thane@medseva.in',
      workingHours: 'Mon–Sat: 7:00 AM – 7:00 PM',
      availableSlots: ['07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '03:00 PM', '05:00 PM'],
      homeCollection: true,
      labVisit: true,
      isActive: true,
    },
    {
      name: 'MedSeva - Navi Mumbai (Vashi)',
      code: 'MSV-NMB-V',
      line1: 'Sector 17, Near Vashi Railway Station',
      city: 'Navi Mumbai',
      state: 'Maharashtra',
      pincode: '400703',
      latitude: 19.0759,
      longitude: 72.9987,
      contactNumber: '9876500003',
      email: 'vashi@medseva.in',
      workingHours: 'Mon–Sun: 6:30 AM – 8:00 PM',
      availableSlots: ['06:30 AM', '07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '03:00 PM', '05:00 PM'],
      homeCollection: true,
      labVisit: true,
      isActive: true,
    },
    {
      name: 'MedSeva - Vasai East',
      code: 'MSV-VSI-E',
      line1: 'Near Vasai Railway Station, Vasai East',
      city: 'Vasai',
      state: 'Maharashtra',
      pincode: '401202',
      latitude: 19.3664,
      longitude: 72.8526,
      contactNumber: '9876500004',
      email: 'vasai@medseva.in',
      workingHours: 'Mon–Sat: 7:00 AM – 6:00 PM',
      availableSlots: ['07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '04:00 PM'],
      homeCollection: false,
      labVisit: true,
      isActive: true,
    },
    {
      name: 'MedSeva - Pune Kothrud',
      code: 'MSV-PNE-K',
      line1: 'Lane 5, Karve Road, Kothrud',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411038',
      latitude: 18.5074,
      longitude: 73.8077,
      contactNumber: '9876500005',
      email: 'kothrud@medseva.in',
      workingHours: 'Mon–Sat: 7:00 AM – 7:30 PM',
      availableSlots: ['07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '02:00 PM', '04:00 PM', '06:00 PM'],
      homeCollection: true,
      labVisit: true,
      isActive: true,
    },
    {
      name: 'MedSeva - Borivali West',
      code: 'MSV-BOR-W',
      line1: 'IC Colony, Borivali West, Near S.V. Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400092',
      latitude: 19.2307,
      longitude: 72.8567,
      contactNumber: '9876500006',
      email: 'borivali@medseva.in',
      workingHours: 'Mon–Sat: 7:00 AM – 8:00 PM',
      availableSlots: ['07:00 AM', '08:00 AM', '09:00 AM', '10:00 AM', '11:00 AM', '01:00 PM', '03:00 PM', '05:00 PM', '07:00 PM'],
      homeCollection: true,
      labVisit: true,
      isActive: false, // Inactive — to test filter
    },
  ];

  for (const branch of branchesData) {
    await prisma.branch.upsert({
      where: { code: branch.code },
      update: {},
      create: branch,
    });
  }
  console.log('✅ Branches seeded (6 branches across Mumbai, Thane, Navi Mumbai, Vasai, Pune)');

  console.log('✨ Database seeding completed!');
}


main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
