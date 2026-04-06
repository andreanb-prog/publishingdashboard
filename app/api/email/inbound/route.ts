import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Postmark inbound email webhook — always return 200, never 4xx/5xx (it will retry forever)

interface PostmarkInboundPayload {
  From:     string
  To:       string
  Subject:  string
  TextBody: string
  HtmlBody: string
}

function ok() {
  return NextResponse.json({ ok: true }, { status: 200 })
}

// --- Parsers ---

function parsePartnerName(body: string): string | null {
  const m = body.match(/(?:List|From):\s*(.+)/i)
  return m ? m[1].trim() : null
}

function parseListSize(body: string): number | null {
  const m = body.match(/(\d[\d,]*)\s*(?:subscribers|members)/i)
  if (!m) return null
  return parseInt(m[1].replace(/,/g, ''), 10)
}

function parsePromoDate(body: string): Date | null {
  // MM/DD/YYYY
  const m1 = body.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/)
  if (m1) {
    const d = new Date(`${m1[3]}-${m1[1].padStart(2,'0')}-${m1[2].padStart(2,'0')}T12:00:00Z`)
    if (!isNaN(d.getTime())) return d
  }
  // Month DD, YYYY
  const m2 = body.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})\b/i)
  if (m2) {
    const d = new Date(`${m2[1]} ${m2[2]}, ${m2[3]}`)
    if (!isNaN(d.getTime())) return d
  }
  return null
}

function parseClicks(body: string): number | null {
  const m = body.match(/Clicks?:\s*(\d[\d,]*)/i)
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : null
}

function parseImpressions(body: string): number | null {
  const m = body.match(/Opens?:\s*(\d[\d,]*)/i)
  return m ? parseInt(m[1].replace(/,/g, ''), 10) : null
}

// Find a SwapEntry by partnerName + promoDate within ±3 days
async function findSwapEntry(userId: string, partnerName: string | null, promoDate: Date | null) {
  if (!partnerName && !promoDate) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId }

  if (partnerName) {
    where.partnerName = { contains: partnerName, mode: 'insensitive' }
  }

  if (promoDate) {
    const low  = new Date(promoDate); low.setDate(low.getDate() - 3)
    const high = new Date(promoDate); high.setDate(high.getDate() + 3)
    where.promoDate = { gte: low, lte: high }
  }

  return db.swapEntry.findFirst({ where })
}

export async function POST(req: NextRequest) {
  let payload: PostmarkInboundPayload

  try {
    payload = await req.json()
  } catch {
    console.error('[inbound] Failed to parse request body')
    return ok()
  }

  const { From = '', To = '', Subject = '', TextBody = '' } = payload
  const subjectLower = Subject.toLowerCase()
  const fromLower    = From.toLowerCase()

  // --- Extract userId from To address: swaps-[userId]@[domain] ---
  const toMatch = To.match(/swaps-([^@\s]+)@/i)
  if (!toMatch) {
    console.log('[inbound] No userId in To address, skipping:', To)
    return ok()
  }
  const userId = toMatch[1]

  // --- Look up user ---
  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) {
    console.log('[inbound] User not found for id:', userId)
    return ok()
  }

  // --- Partner messages from BookClicker — log only, no DB writes ---
  if (fromLower.includes('messages@bookclicker.com')) {
    console.log('[inbound] Partner message received — manual review needed')
    return ok()
  }

  try {
    // --- Promo Confirmation ---
    if (subjectLower.includes('promo confirmation')) {
      const partnerName  = parsePartnerName(TextBody)
      const promoDate    = parsePromoDate(TextBody)
      const clicks       = parseClicks(TextBody)
      const impressions  = parseImpressions(TextBody)
      const listSize     = parseListSize(TextBody)

      const entry = await findSwapEntry(userId, partnerName, promoDate)
      if (entry) {
        await db.swapEntry.update({
          where: { id: entry.id },
          data: {
            confirmation: 'approved',
            ...(clicks      != null && { clicks }),
            ...(impressions != null && { impressions }),
            ...(listSize    != null && { partnerListSize: listSize }),
          },
        })
        console.log('[inbound] Promo Confirmation — updated entry', entry.id)
      } else {
        console.log('[inbound] Promo Confirmation — no matching entry found for', partnerName, promoDate)
      }
      return ok()
    }

    // --- New booking (they are promoting Elle) ---
    if (subjectLower.includes('new booking')) {
      const partnerName = parsePartnerName(TextBody)
      const listSize    = parseListSize(TextBody)
      const promoDate   = parsePromoDate(TextBody)

      await db.swapEntry.create({
        data: {
          userId,
          promoType:    'swap',
          role:         'inbound',
          platform:     'bookclicker',
          confirmation: 'applied',
          myList:       '',
          partnerName:  partnerName ?? undefined,
          partnerListSize: listSize ?? undefined,
          promoDate:    promoDate ?? undefined,
        },
      })
      console.log('[inbound] New booking — created swap entry for', partnerName)
      return ok()
    }

    // --- Swap request accepted ---
    if (subjectLower.includes('swap request has been accepted')) {
      const partnerName = parsePartnerName(TextBody)
      const promoDate   = parsePromoDate(TextBody)

      const entry = await findSwapEntry(userId, partnerName, promoDate)
      if (entry) {
        await db.swapEntry.update({
          where: { id: entry.id },
          data: { confirmation: 'approved' },
        })
        console.log('[inbound] Swap accepted — updated entry', entry.id)
      } else {
        console.log('[inbound] Swap accepted — no matching entry for', partnerName, promoDate)
      }
      return ok()
    }

    // --- Automatically cancelled ---
    if (subjectLower.includes('automatically cancelled')) {
      const partnerName = parsePartnerName(TextBody)
      const promoDate   = parsePromoDate(TextBody)

      const entry = await findSwapEntry(userId, partnerName, promoDate)
      if (entry) {
        await db.swapEntry.update({
          where: { id: entry.id },
          data: { confirmation: 'cancelled' },
        })
        console.log('[inbound] Cancelled — updated entry', entry.id)
      } else {
        console.log('[inbound] Cancelled — no matching entry for', partnerName, promoDate)
      }
      return ok()
    }

    console.log('[inbound] Unrecognized subject, no action taken:', Subject)
  } catch (err) {
    console.error('[inbound] Parse/DB error (still returning 200):', err)
  }

  return ok()
}
