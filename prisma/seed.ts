import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create a demo photographer
  const hashedPassword = await bcrypt.hash('demo1234', 12);
  
  const photographer = await prisma.user.upsert({
    where: { email: 'demo@snapshare.com' },
    update: {},
    create: {
      email: 'demo@snapshare.com',
      name: 'Demo Photographer',
      passwordHash: hashedPassword,
    },
  });

  console.log('Created demo user:', photographer.email);
  console.log('Password: demo1234');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
