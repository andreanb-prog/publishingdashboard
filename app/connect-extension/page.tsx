import { getAugmentedSession } from '@/lib/getSession'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { ConnectExtensionClient } from './ConnectExtensionClient'

interface Props {
  searchParams: { token?: string }
}

export default async function ConnectExtensionPage({ searchParams }: Props) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) redirect('/login')

  const token = searchParams.token ?? ''

  // Register the token the first time this page loads so we can enforce expiry.
  // upsert with empty update preserves the original createdAt on reloads.
  if (token) {
    await db.connectionToken.upsert({
      where: { token },
      create: { token, userId: session.user.id },
      update: {},
    })
  }

  return (
    <ConnectExtensionClient
      token={token}
      userName={session.user.name ?? null}
    />
  )
}
