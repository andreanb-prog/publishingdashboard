import { redirect } from 'next/navigation'
import { getAugmentedSession } from '@/lib/getSession'

export default async function RootPage() {
  const session = await getAugmentedSession()
  redirect(session ? '/dashboard' : '/login')
}
