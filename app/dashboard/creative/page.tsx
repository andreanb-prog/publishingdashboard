// app/dashboard/creative/page.tsx
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { CreativeClient } from './CreativeClient'

export const metadata = { title: 'Creative Hub — AuthorDash' }

export default async function CreativePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [books, creatives] = await Promise.all([
    db.book.findMany({
      where: { userId: session.user.id },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, title: true, phase: true, colorCode: true },
    }),
    db.creative.findMany({
      where: { userId: session.user.id },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    }),
  ])

  const serializedCreatives = creatives.map(c => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }))

  return <CreativeClient initialCreatives={serializedCreatives} books={books} />
}
