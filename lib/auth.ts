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
          const row = await db.user.findUnique({
            where: { id: user.id },
            select: {
              subscriptionStatus: true,
              subscriptionPlan: true,
              trialEndsAt: true,
              createdAt: true,
              penName: true,
              preferredGreetingName: true,
            },
          })
          if (row) {
            session.user.subscriptionStatus = row.subscriptionStatus ?? null
            session.user.subscriptionPlan = row.subscriptionPlan ?? null
            session.user.trialEndsAt = row.trialEndsAt ? row.trialEndsAt.toISOString() : null
            session.user.penName = row.penName ?? null
            session.user.preferredGreetingName = row.preferredGreetingName ?? null
            // Use pen name as display name if set
            if (row.penName) session.user.name = row.penName

            // Auto-set trial for new users
            if (!row.subscriptionStatus && !row.trialEndsAt && row.createdAt) {
              try {
                const trialEnd = new Date(row.createdAt.getTime() + 14 * 24 * 60 * 60 * 1000)
                await db.user.update({
                  where: { id: user.id },
                  data: { subscriptionStatus: 'trialing', trialEndsAt: trialEnd },
                })
                session.user.subscriptionStatus = 'trialing'
                session.user.trialEndsAt = trialEnd.toISOString()
              } catch { /* non-fatal */ }
            }
          }
        } catch {
          // Columns don't exist yet — that's fine, user gets full access as beta user
        }
      }
      return session
    },
  },
  events: {
    // Fire-and-forget: add new users to MailerLite "AuthorDash Beta Users" group
    createUser: async ({ user }) => {
      const apiKey = process.env.MAILERLITE_API_KEY
      if (!apiKey || !user.email) return
      try {
        const ML = 'https://connect.mailerlite.com/api'
        const headers = {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }

        // 1. Upsert subscriber
        await fetch(`${ML}/subscribers`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            email: user.email,
            fields: {
              name: user.name ?? '',
              last_name: '',
            },
            status: 'active',
          }),
        })

        // 2. Find or create "AuthorDash Beta Users" group
        const groupsRes = await fetch(`${ML}/groups?limit=100`, { headers })
        if (!groupsRes.ok) return
        const groupsData = await groupsRes.json()
        let groupId: string | null = null
        const existing = (groupsData.data ?? []).find(
          (g: { name: string; id: string }) => g.name === 'AuthorDash Beta Users'
        )
        if (existing) {
          groupId = existing.id
        } else {
          const createRes = await fetch(`${ML}/groups`, {
            method: 'POST', headers,
            body: JSON.stringify({ name: 'AuthorDash Beta Users' }),
          })
          if (createRes.ok) {
            const created = await createRes.json()
            groupId = created.data?.id ?? null
          }
        }

        // 3. Assign subscriber to group
        if (groupId && user.email) {
          await fetch(`${ML}/subscribers/${encodeURIComponent(user.email)}/groups/${groupId}`, {
            method: 'POST', headers,
          })
        }
      } catch { /* Non-fatal — never block auth */ }
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
      preferredGreetingName?: string | null
      adminImpersonating?: string | null
      adminRealEmail?: string | null
    }
  }
}
