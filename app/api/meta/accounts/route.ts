// app/api/meta/accounts/route.ts — Return ad accounts accessible with the saved token
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const GRAPH = 'https://graph.facebook.com/v21.0'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.$queryRawUnsafe<any[]>(
    `SELECT "metaAccessToken" FROM "User" WHERE "id" = $1 LIMIT 1`,
    session.user.id
  )
  const token = rows[0]?.metaAccessToken
  if (!token) return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })

  try {
    const res = await fetch(
      `${GRAPH}/me/adaccounts?fields=id,name,account_status,amount_spent&limit=50&access_token=${token}`
    )
    const json = await res.json()

    if (json.error) {
      console.error('[Meta Accounts] API error:', json.error)
      return NextResponse.json({ error: json.error.message }, { status: 400 })
    }

    const accounts = (json.data ?? []).map((a: any) => ({
      id:     a.id.startsWith('act_') ? a.id : `act_${a.id}`,
      name:   a.name,
      status: a.account_status === 1 ? 'active' : 'disabled',
      spent:  a.amount_spent ?? '0',
    }))

    return NextResponse.json({ accounts })
  } catch (err) {
    console.error('[Meta Accounts] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}
