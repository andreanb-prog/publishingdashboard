// lib/auth.ts
import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import { PrismaAdapter } from '@auth/prisma-adapter'
import { db } from './db'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      if (session?.user) {
        session.user.id = user.id

        // Try to fetch subscription data — gracefully skip if columns don't exist
        try {
          const rows = await db.$queryRawUnsafe<any[]>(
            `SELECT "subscriptionStatus", "subscriptionPlan", "trialEndsAt", "createdAt", "penName" FROM "User" WHERE "id" = $1 LIMIT 1`,
            user.id
          )
          const row = rows[0]
          if (row) {
            session.user.subscriptionStatus = row.subscriptionStatus ?? null
            session.user.subscriptionPlan = row.subscriptionPlan ?? null
            session.user.trialEndsAt = row.trialEndsAt ? new Date(row.trialEndsAt).toISOString() : null
            session.user.penName = row.penName ?? null
            // Use pen name as display name if set
            if (row.penName) session.user.name = row.penName

            // Auto-set trial for new users
            if (!row.subscriptionStatus && !row.trialEndsAt && row.createdAt) {
              try {
                const trialEnd = new Date(new Date(row.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000)
                await db.$executeRawUnsafe(
                  `UPDATE "User" SET "subscriptionStatus" = 'trialing', "trialEndsAt" = $1 WHERE "id" = $2`,
                  trialEnd, user.id
                )
                session.user.subscriptionStatus = 'trialing'
                session.user.trialEndsAt = trialEnd.toISOString()
              } catch { /* column may not exist */ }
            }
          }
        } catch {
          // Columns don't exist yet — that's fine, user gets full access as beta user
        }
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
}

// Extend the session type
declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      subscriptionStatus?: string | null
      subscriptionPlan?: string | null
      trialEndsAt?: string | null
      penName?: string | null
    }
  }
}
