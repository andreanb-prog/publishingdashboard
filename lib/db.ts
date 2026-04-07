// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Neon serverless closes idle connections — limit pool to 1 and set timeouts
function buildDatabaseUrl() {
  const base = process.env.DATABASE_URL ?? ''
  if (!base) return base
  const url = new URL(base)
  if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '1')
  if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '20')
  if (!url.searchParams.has('connect_timeout')) url.searchParams.set('connect_timeout', '10')
  return url.toString()
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: buildDatabaseUrl() } },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
