import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://app:app@localhost:5432/user_activity_tracking?schema=public';

const prisma = new PrismaClient({
  adapter: new PrismaPg(connectionString),
});

async function main() {
  const users = [
    {
      email: 'alice@example.com',
      name: 'Alice',
      timezone: 'Europe/Moscow',
      isActive: true,
    },
    {
      email: 'bob@example.com',
      name: 'Bob',
      timezone: 'Europe/Berlin',
      isActive: true,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: {
        email: user.email,
      },
      update: {
        name: user.name,
        timezone: user.timezone,
        isActive: user.isActive,
      },
      create: user,
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
