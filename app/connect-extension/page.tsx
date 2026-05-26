import { getAugmentedSession } from '@/lib/getSession'
import { redirect } from 'next/navigation'
import { ConnectExtensionClient } from './ConnectExtensionClient'

interface Props {
  searchParams: { token?: string }
}

export default async function ConnectExtensionPage({ searchParams }: Props) {
  const session = await getAugmentedSession()
  if (!session?.user?.id) redirect('/login')

  const token = searchParams.token ?? ''

  return (
    <ConnectExtensionClient
      token={token}
      userName={session.user.name ?? null}
    />
  )
}
