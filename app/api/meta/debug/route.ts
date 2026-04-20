// app/api/meta/debug/route.ts — Debug Meta connection: permissions, ad accounts, raw insights
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

const GRAPH_URL = 'https://graph.facebook.com/v19.0'

export async function GET() {
  const session = await getAugmentedSession()
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

  // List all ad accounts with spend
  try {
    const acctRes = await fetch(`${GRAPH_URL}/me/adaccounts?fields=id,name,account_status,amount_spent&limit=50&access_token=${token}`)
    const acctData = await acctRes.json()
    debug.adAccounts = acctData
  } catch (e) {
    debug.adAccountsError = String(e)
  }

  // Check businesses and their owned ad accounts
  const businessOwnedAccounts: Record<string, unknown> = {}
  try {
    const bizRes = await fetch(`${GRAPH_URL}/me/businesses?fields=id,name&limit=50&access_token=${token}`)
    const bizData = await bizRes.json()
    debug.businesses = bizData
    for (const biz of (bizData.data ?? [])) {
      try {
        const ownedRes = await fetch(`${GRAPH_URL}/${biz.id}/owned_ad_accounts?fields=id,name,account_status,amount_spent&limit=50&access_token=${token}`)
        businessOwnedAccounts[`${biz.name} (${biz.id})`] = await ownedRes.json()
      } catch (e) { businessOwnedAccounts[biz.id] = String(e) }
    }
  } catch (e) { debug.businessesError = String(e) }
  debug.businessOwnedAccounts = businessOwnedAccounts

  // Check Instagram-linked accounts
  try {
    const igRes = await fetch(`${GRAPH_URL}/me/instagram_accounts?fields=id,name&limit=50&access_token=${token}`)
    debug.instagramAccounts = await igRes.json()
  } catch (e) { debug.instagramAccountsError = String(e) }

  // Probe known + stored account IDs with insights
  const accountsToProbe = ['act_898774062895926', 'act_940232825191906']
  if (user.metaAdAccountId && !accountsToProbe.includes(user.metaAdAccountId)) {
    accountsToProbe.push(user.metaAdAccountId.startsWith('act_') ? user.metaAdAccountId : `act_${user.metaAdAccountId}`)
  }
  // Also probe any business-owned accounts
  for (const val of Object.values(businessOwnedAccounts)) {
    for (const acct of ((val as any)?.data ?? [])) {
      const id = acct.id.startsWith('act_') ? acct.id : `act_${acct.id}`
      if (!accountsToProbe.includes(id)) accountsToProbe.push(id)
    }
  }
  const insightsResults: Record<string, unknown> = {}
  for (const accountId of accountsToProbe) {
    try {
      const fields = 'campaign_name,spend,impressions,clicks,ctr,cpc'
      const insightsRes = await fetch(
        `${GRAPH_URL}/${accountId}/insights?fields=${fields}&date_preset=last_30d&level=campaign&limit=10&access_token=${token}`
      )
      insightsResults[accountId] = await insightsRes.json()
    } catch (e) {
      insightsResults[accountId] = { error: String(e) }
    }
  }
  debug.insightsSample = insightsResults

  return NextResponse.json(debug)
}
