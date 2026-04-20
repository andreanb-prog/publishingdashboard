// app/api/meta/accounts/route.ts — Return ad accounts accessible with the saved token
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

const GRAPH = 'https://graph.facebook.com/v21.0'

export async function GET() {
  const session = await getAugmentedSession()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.$queryRawUnsafe<any[]>(
    `SELECT "metaAccessToken" FROM "User" WHERE "id" = $1 LIMIT 1`,
    session.user.id
  )
  const token = rows[0]?.metaAccessToken
  if (!token) return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })

  try {
    const seen = new Set<string>()
    const accounts: { id: string; name: string; status: string; spent: string }[] = []

    const addAccount = (a: any) => {
      const id = a.id.startsWith('act_') ? a.id : `act_${a.id}`
      if (seen.has(id)) return
      seen.add(id)
      accounts.push({
        id,
        name:   a.name,
        status: a.account_status === 1 ? 'active' : 'disabled',
        spent:  a.amount_spent ?? '0',
      })
    }

    // Path 1: accounts directly on the user
    const directRes = await fetch(
      `${GRAPH}/me/adaccounts?fields=id,name,account_status,amount_spent&limit=50&access_token=${token}`
    )
    const directJson = await directRes.json()
    if (!directJson.error) {
      for (const a of (directJson.data ?? [])) addAccount(a)
    }

    // Path 2: accounts owned by connected businesses
    const bizRes = await fetch(
      `${GRAPH}/me/businesses?fields=id,name&limit=50&access_token=${token}`
    )
    const bizJson = await bizRes.json()
    for (const biz of (bizJson.data ?? [])) {
      try {
        const ownedRes = await fetch(
          `${GRAPH}/${biz.id}/owned_ad_accounts?fields=id,name,account_status,amount_spent&limit=50&access_token=${token}`
        )
        const ownedJson = await ownedRes.json()
        if (!ownedJson.error) {
          for (const a of (ownedJson.data ?? [])) addAccount(a)
        }
      } catch { /* skip this business */ }
    }

    if (accounts.length === 0) {
      return NextResponse.json({ error: 'No ad accounts found for this Meta connection.' }, { status: 400 })
    }

    return NextResponse.json({ accounts })
  } catch (err) {
    console.error('[Meta Accounts] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}
