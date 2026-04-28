// lib/getSession.ts
// Drop-in replacement for getServerSession(authOptions) that supports admin impersonation.
// All API routes should call getAugmentedSession() instead of getServerSession(authOptions).
import { getServerSession } from 'next-auth'
import { cookies } from 'next/headers'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '').split(',').map(e => e.trim()).filter(Boolean)
export const IMPERSONATE_COOKIE = 'authordash_impersonate'

export async function getAugmentedSession() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return session

  const realEmail = session.user.email ?? ''
  if (!ADMIN_EMAILS.includes(realEmail)) return session

  const cookieStore = cookies()
  const impersonating = cookieStore.get(IMPERSONATE_COOKIE)?.value
  if (!impersonating) return session

  try {
    const targetUser = await db.user.findUnique({
      where: { email: impersonating },
      select: {
        id: true,
        email: true,
        name: true,
        penName: true,
        preferredGreetingName: true,
        subscriptionStatus: true,
        subscriptionPlan: true,
        trialEndsAt: true,
      },
    })
    if (!targetUser) return session

    return {
      ...session,
      user: {
        ...session.user,
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.penName ?? targetUser.name,
        penName: targetUser.penName ?? null,
        preferredGreetingName: targetUser.preferredGreetingName ?? null,
        subscriptionStatus: targetUser.subscriptionStatus ?? null,
        subscriptionPlan: targetUser.subscriptionPlan ?? null,
        trialEndsAt: targetUser.trialEndsAt ? targetUser.trialEndsAt.toISOString() : null,
        adminImpersonating: impersonating,
        adminRealEmail: realEmail,
      },
    }
  } catch {
    return session
  }
}
