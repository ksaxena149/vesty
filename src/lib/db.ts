import { PrismaClient } from '../generated/prisma'

declare global {
  // eslint-disable-next-line no-var, no-unused-vars
  var __prisma: PrismaClient | undefined
}

export const prisma =
  globalThis.__prisma ||
  new PrismaClient({
    log: ['query', 'error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}

// Test database connection
export async function testConnection() {
  try {
    await prisma.$connect()
    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}

// Graceful shutdown
export async function disconnectDatabase() {
  await prisma.$disconnect()
}

// Get database health status
export async function getDatabaseStatus() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { healthy: true, message: 'Database is accessible' }
  } catch (error) {
    return {
      healthy: false,
      message: `Database error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}
