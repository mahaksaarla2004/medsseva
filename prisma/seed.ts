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
  console.log('✨ Database seeding completed!');// 4. Seed Admin User
const hashedPassword = await bcrypt.hash('admin@123', 10);
  const execPassword = await bcrypt.hash('exec@123', 10);

  await prisma.user.upsert({
    where: { mobile: '0000000000' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@lms.com',
      mobile: '0000000000',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

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

  console.log('✅ Admin seeded — mobile: 0000000000 / password: admin@123');
  console.log('✅ Executive seeded — mobile: 9999999999 / password: exec@123');
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
