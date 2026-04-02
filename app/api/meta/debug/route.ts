// app/api/meta/debug/route.ts — Debug Meta connection: permissions, ad accounts, raw insights
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

const GRAPH_URL = 'https://graph.facebook.com/v19.0'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rows = await db.$queryRawUnsafe<any[]>(
    `SELECT "metaAccessToken", "metaAdAccountId", "metaTokenExpires" FROM "User" WHERE "id" = $1 LIMIT 1`,
    session.user.id
  )
  const user = rows[0]

  if (!user?.metaAccessToken) {
    return NextResponse.json({ error: 'Meta not connected' }, { status: 400 })
  }

  const token = user.metaAccessToken
  const debug: Record<string, unknown> = {
    storedAdAccountId: user.metaAdAccountId,
    tokenExpires: user.metaTokenExpires,
  }

  // Check permissions
  try {
    const permRes = await fetch(`${GRAPH_URL}/me/permissions?access_token=${token}`)
    const permData = await permRes.json()
    debug.permissions = permData.data?.map((p: any) => `${p.permission}:${p.status}`) ?? permData
  } catch (e) {
    debug.permissionsError = String(e)
  }

  // List all ad accounts
  try {
    const acctRes = await fetch(`${GRAPH_URL}/me/adaccounts?fields=id,name,account_status&limit=50&access_token=${token}`)
    const acctData = await acctRes.json()
    debug.adAccounts = acctData
  } catch (e) {
    debug.adAccountsError = String(e)
  }

  // Raw insights from stored account (last 30 days)
  if (user.metaAdAccountId) {
    const accountId = user.metaAdAccountId.startsWith('act_')
      ? user.metaAdAccountId
      : `act_${user.metaAdAccountId}`
    try {
      const since = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
      const until = new Date().toISOString().split('T')[0]
      const fields = 'campaign_name,spend,impressions,clicks,ctr,cpc'
      const insightsRes = await fetch(
        `${GRAPH_URL}/${accountId}/insights?fields=${fields}&time_range={"since":"${since}","until":"${until}"}&level=campaign&limit=10&access_token=${token}`
      )
      const insightsData = await insightsRes.json()
      debug.insightsSample = insightsData
    } catch (e) {
      debug.insightsError = String(e)
    }
  }

  return NextResponse.json(debug)
}
