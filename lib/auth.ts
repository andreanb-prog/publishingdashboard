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

        // Fetch subscription data
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          select: {
            subscriptionStatus: true,
            subscriptionPlan: true,
            trialEndsAt: true,
            createdAt: true,
          },
        })

        if (dbUser) {
          session.user.subscriptionStatus = dbUser.subscriptionStatus ?? null
          session.user.subscriptionPlan = dbUser.subscriptionPlan ?? null
          session.user.trialEndsAt = dbUser.trialEndsAt?.toISOString() ?? null

          // Auto-set trial for new users (14 days from account creation)
          if (!dbUser.subscriptionStatus && !dbUser.trialEndsAt) {
            const trialEnd = new Date(dbUser.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000)
            await db.user.update({
              where: { id: user.id },
              data: { subscriptionStatus: 'trialing', trialEndsAt: trialEnd },
            })
            session.user.subscriptionStatus = 'trialing'
            session.user.trialEndsAt = trialEnd.toISOString()
          }
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
    }
  }
}
