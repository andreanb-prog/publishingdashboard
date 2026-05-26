import { getAugmentedSession } from '@/lib/getSession'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { ConnectExtensionClient } from './ConnectExtensionClient'

const TOKEN_EXPIRY_MS = 10 * 60 * 1000

interface Props {
  searchParams: { token?: string }
}

export default async function ConnectExtensionPage({ searchParams }: Props) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) redirect('/login')

  const token = searchParams.token ?? ''
  let tokenError: string | null = null

  if (token) {
    const existing = await db.connectionToken.findUnique({ where: { token } })

    if (!existing) {
      // First visit — register with a timestamp so expiry can be enforced
      await db.connectionToken.create({ data: { token, userId: session.user.id } })
    } else if (existing.usedAt) {
      tokenError = 'This connection link has already been used.'
    } else if (Date.now() - existing.createdAt.getTime() > TOKEN_EXPIRY_MS) {
      tokenError = 'This connection link has expired. Please generate a new one from the extension.'
    }
  } else {
    tokenError = 'Missing connection token.'
  }

  return (
    <ConnectExtensionClient
      token={token}
      userName={session.user.name ?? null}
      tokenError={tokenError}
    />
  )
}
