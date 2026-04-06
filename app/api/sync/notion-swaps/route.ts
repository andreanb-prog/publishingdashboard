import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { Client } from '@notionhq/client'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'

const STARTER_POLICIES = [
  { ruleName: 'No box sets as features',            category: 'format',       appliesTo: 'both', severity: 'block' },
  { ruleName: 'No erotica',                         category: 'content_heat', appliesTo: 'both', severity: 'block' },
  { ruleName: 'No YA',                              category: 'audience',     appliesTo: 'both', severity: 'block' },
  { ruleName: 'No sweet/clean (audience mismatch)', category: 'audience',     appliesTo: 'both', severity: 'warn'  },
]

// ── Notion property extractors ────────────────────────────────────────────────

function getText(props: PageObjectResponse['properties'], key: string): string {
  const p = props[key]
  if (!p) return ''
  if (p.type === 'title')        return p.title.map((t: { plain_text: string }) => t.plain_text).join('').trim()
  if (p.type === 'rich_text')    return p.rich_text.map((t: { plain_text: string }) => t.plain_text).join('').trim()
  return ''
}

function getSelect(props: PageObjectResponse['properties'], key: string): string {
  const p = props[key]
  if (p?.type === 'select' && p.select?.name) return p.select.name
  return ''
}

function getNumber(props: PageObjectResponse['properties'], key: string): number | null {
  const p = props[key]
  if (p?.type === 'number' && p.number != null) return p.number
  return null
}

function getDate(props: PageObjectResponse['properties'], key: string): Date | null {
  const p = props[key]
  if (p?.type === 'date' && p.date?.start) return new Date(p.date.start)
  return null
}

// ── Field mappers ─────────────────────────────────────────────────────────────

function mapRole(selectValue: string): string | null {
  if (selectValue.includes('📣')) return 'inbound'
  if (selectValue.includes('♥')  || selectValue.includes('❤')) return 'outbound'
  return null
}

function mapPlatform(selectValue: string): string {
  const v = selectValue.toLowerCase().replace(/[\s-]/g, '')
  if (v.includes('bookclicker'))     return 'bookclicker'
  if (v.includes('bookfunnel'))      return 'bookfunnel'
  if (v.includes('fpa'))             return 'fpa'
  if (v.includes('direct'))         return 'direct'
  return 'other'
}

function mapConfirmation(selectValue: string): string {
  const v = selectValue.toLowerCase()
  if (v === 'approved') return 'approved'
  if (v === 'live')     return 'approved'  // treat "live" as approved
  if (v === 'complete') return 'complete'
  if (v === 'cancelled' || v === 'canceled') return 'cancelled'
  return 'applied'
}

function mapPaymentType(selectValue: string): string {
  return selectValue.toLowerCase().includes('paid') ? 'paid' : 'swap'
}

function mapPromoType(selectValue: string): string {
  return selectValue.toLowerCase().includes('promo') ? 'paid_promo' : 'swap'
}

function parsePartnerName(campaignName: string): string | null {
  // Strip leading emoji icon (📣, ♥️, ❤️, etc.) and whitespace
  const stripped = campaignName.replace(/^[^\w\d('"]+/, '').trim()
  // Take everything before the first " — " or " - "
  const dashIdx = stripped.indexOf(' — ')
  if (dashIdx !== -1) return stripped.slice(0, dashIdx).trim()
  const shortDash = stripped.indexOf(' - ')
  if (shortDash !== -1) return stripped.slice(0, shortDash).trim()
  return stripped || null
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id
  const apiKey = process.env.NOTION_API_KEY
  const dbId   = process.env.NOTION_SWAP_DB_ID

  if (!apiKey) return NextResponse.json({ error: 'NOTION_API_KEY not set' }, { status: 500 })
  if (!dbId)   return NextResponse.json({ error: 'NOTION_SWAP_DB_ID not set' }, { status: 500 })

  // ── Seed defaults if this is the user's first sync ──────────────────────────
  const [listCount, policyCount] = await Promise.all([
    db.authorList.count({ where: { userId } }),
    db.swapPolicy.count({ where: { userId } }),
  ])

  if (listCount === 0) {
    await db.authorList.create({ data: { userId, name: 'Elle Wilder Books', isDefault: true } })
  }
  if (policyCount === 0) {
    await db.swapPolicy.createMany({
      data: STARTER_POLICIES.map(p => ({ ...p, userId })),
    })
  }

  // ── Query Notion ────────────────────────────────────────────────────────────
  const notion = new Client({ auth: apiKey })

  const pages: PageObjectResponse[] = []
  let cursor: string | undefined = undefined

  do {
    const res = await notion.databases.query({
      database_id: dbId,
      start_cursor: cursor,
      page_size: 100,
    })
    for (const page of res.results) {
      if ('properties' in page) pages.push(page as PageObjectResponse)
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)

  // ── Map and upsert ──────────────────────────────────────────────────────────
  let created = 0
  let updated = 0

  for (const page of pages) {
    const props = page.properties

    const campaignName  = getText(props, 'Campaign Name')
    const selectVal     = getSelect(props, 'Select')
    const promoDate     = getDate(props, 'Promo Date')
    const platformRaw   = getSelect(props, 'Platform')
    const confirmRaw    = getSelect(props, 'Confirmation')
    const paymentRaw    = getSelect(props, 'Payment Type')
    const promoTypeRaw  = getSelect(props, 'Property Type')
    const cost          = getNumber(props, 'Cost')
    const listSize      = getNumber(props, 'List Size')
    const clicks        = getNumber(props, 'Clicks')
    const impressions   = getNumber(props, 'Impressions')
    const subsGained    = getNumber(props, 'Subscribers Gained')

    const partnerName   = parsePartnerName(campaignName)
    const role          = mapRole(selectVal)
    const platform      = platformRaw ? mapPlatform(platformRaw) : 'bookclicker'
    const confirmation  = confirmRaw  ? mapConfirmation(confirmRaw)  : 'applied'
    const paymentType   = paymentRaw  ? mapPaymentType(paymentRaw)   : 'swap'
    const promoType     = promoTypeRaw ? mapPromoType(promoTypeRaw)  : 'swap'

    const data = {
      userId,
      promoType,
      role,
      platform,
      partnerName,
      myList:        'Elle Wilder Books',
      promoDate,
      confirmation,
      paymentType,
      cost:          cost          ?? 0,
      partnerListSize: listSize    ?? null,
      clicks:          clicks      ?? null,
      impressions:     impressions ?? null,
      subsGained:      subsGained  ?? null,
      notes:           campaignName || null,
    }

    // Match on userId + promoDate + partnerName + role (all non-null combos)
    const existing = promoDate && partnerName
      ? await db.swapEntry.findFirst({
          where: {
            userId,
            promoDate,
            partnerName,
            ...(role ? { role } : {}),
          },
        })
      : null

    if (existing) {
      await db.swapEntry.update({ where: { id: existing.id }, data })
      updated++
    } else {
      await db.swapEntry.create({ data })
      created++
    }
  }

  return NextResponse.json({ success: true, synced: pages.length, created, updated })
}
