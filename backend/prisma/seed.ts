import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('✅ Seed ejecutado.');

  // En Sprint 4 no sembramos datos manuales.
  // Las ligas, equipos y partidos serán importados desde API-Football.
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });