import { NextResponse } from 'next/server'
import { getAugmentedSession } from '@/lib/getSession'
import { db } from '@/lib/db'

const STARTER_POLICIES = [
  { ruleName: 'No box sets as features',            category: 'format',       appliesTo: 'both', severity: 'block' },
  { ruleName: 'No erotica',                         category: 'content_heat', appliesTo: 'both', severity: 'block' },
  { ruleName: 'No YA',                              category: 'audience',     appliesTo: 'both', severity: 'block' },
  { ruleName: 'No sweet/clean (audience mismatch)', category: 'audience',     appliesTo: 'both', severity: 'warn'  },
]

// ── Notion property extractors ────────────────────────────────────────────────

function getText(props: Record<string, any>, key: string): string {
  const p = props[key]
  if (!p) return ''
  if (p.type === 'title')        return p.title.map((t: { plain_text: string }) => t.plain_text).join('').trim()
  if (p.type === 'rich_text')    return p.rich_text.map((t: { plain_text: string }) => t.plain_text).join('').trim()
  return ''
}

function getSelect(props: Record<string, any>, key: string): string {
  const p = props[key]
  if (p?.type === 'select' && p.select?.name) return p.select.name
  return ''
}

function getNumber(props: Record<string, any>, key: string): number | null {
  const p = props[key]
  if (p?.type === 'number' && p.number != null) return p.number
  return null
}

function getDate(props: Record<string, any>, key: string): Date | null {
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
  const session = await getAugmentedSession()
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
  let allPages: any[] = []
  let cursor: string | undefined = undefined

  do {
    const body: Record<string, any> = { page_size: 100 }
    if (cursor) body.start_cursor = cursor

    const response = await fetch(
      `https://api.notion.com/v1/databases/${dbId}/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Notion-Version': '2022-06-28',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    const data = await response.json()
    allPages = allPages.concat(data.results || [])
    cursor = data.has_more ? data.next_cursor : undefined
  } while (cursor)

  // ── Map and upsert ──────────────────────────────────────────────────────────
  let created = 0
  let updated = 0

  for (const page of allPages) {
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

  return NextResponse.json({ success: true, synced: allPages.length, created, updated })
}
