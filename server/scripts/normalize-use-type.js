const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Normalizing StockChange.type values that contain "wykorz" to "pobranie"...');
    const res = await prisma.stockChange.updateMany({
      where: {
        OR: [
          { type: { contains: 'wykorz', mode: 'insensitive' } },
          { type: { equals: 'wykorzystanie', mode: 'insensitive' } },
          { type: { equals: 'wykorzystano', mode: 'insensitive' } }
        ]
      },
      data: { type: 'pobranie' }
    });
    console.log(`Updated ${res.count} records.`);
  } catch (err) {
    console.error('Failed to normalize types:', err);
    process.exitCode = 1;
  } finally {
    try { await prisma.$disconnect(); } catch (_) {}
  }
}

if (require.main === module) main();
