import { PrismaClient } from '@prisma/client'

// Use a raw configuration object that matches Prisma 7 expected format
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "file:./dev.db"
    }
  }
} as any)

async function main() {
  // Check if we already have employees
  const count = await prisma.employee.count()
  if (count > 0) {
    console.log('Database already seeded')
    return
  }

  // Seed some dummy employees for testing
  const employees = [
    { name: '店长张三', pin: '1234', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zhang' },
    { name: '员工李四', pin: '5678', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Li' },
    { name: '员工王五', pin: '0000', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Wang' },
    { name: '兼职小赵', pin: '1111', avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Zhao' },
  ]

  for (const emp of employees) {
    await prisma.employee.create({
      data: emp
    })
  }
  console.log('Database seeded with test employees')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })