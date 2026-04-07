export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Postmark inbound email webhook — always return 200, never 4xx/5xx (it will retry forever)

// GET handler — Postmark may do a verification ping before sending emails
export async function GET() {
  console.log('[INBOUND] GET ping received')
  return NextResponse.json({ ok: true }, { status: 200 })
}

interface PostmarkInboundPayload {
  From:        string
  Subject:     string
  TextBody:    string
  HtmlBody:    string
  MailboxHash: string  // extracted from +tag in To address: "swaps-{userId}"
  MessageID:   string
}

function ok() {
  return NextResponse.json({ ok: true }, { status: 200 })
}

// ── Parsers ───────────────────────────────────────────────────────────────────

function parsePartnerName(body: string): string | null {
  const m = body.match(/(?:List|From|Partner|Author):\s*(.+)/i)
  return m ? m[1].trim() : null
}

function parseListSize(body: string): number | null {
  const m = body.match(/(\d[\d,]*)\s*(?:subscribers|members|readers)/i)
  if (!m) return null
  return parseInt(m[1].replace(/,/g, ''), 10)
}

function parsePromoDate(body: string): Date | null {
  // MM/DD/YYYY
  const m1 = body.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/)
  if (m1) {
    const d = new Date(`${m1[3]}-${m1[1].padStart(2, '0')}-${m1[2].padStart(2, '0')}T12:00:00Z`)
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
  const m = body.match(/(?:Opens?|Impressions?):\s*(\d[\d,]*)/i)
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

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  console.log('[INBOUND] POST received from Postmark')

  let payload: PostmarkInboundPayload

  try {
    payload = await req.json()
  } catch {
    console.error('[INBOUND] Failed to parse Postmark payload')
    return ok()
  }

  const { From = '', Subject = '', TextBody = '', MailboxHash = '', MessageID = '' } = payload

  console.log('[INBOUND] Email details —', { MessageID, From, Subject, MailboxHash })

  // ── Identify user from MailboxHash: "swaps-{userId}" ─────────────────────
  const hashMatch = MailboxHash.match(/^swaps-(.+)$/i)
  if (!hashMatch) {
    console.log('[inbound] No userId in MailboxHash — skipping. Hash was:', MailboxHash)
    return ok()
  }
  const userId = hashMatch[1]
  console.log('[inbound] Resolved userId:', userId)

  const user = await db.user.findUnique({ where: { id: userId } })
  if (!user) {
    console.log('[inbound] No user found for id:', userId)
    return ok()
  }
  console.log('[inbound] User found:', user.email)

  const subjectLower = Subject.toLowerCase()

  try {
    // ── New booking (partner is promoting Elle's book) ──────────────────────
    if (subjectLower.includes('new booking')) {
      console.log('[inbound] Classified as: new booking')
      const partnerName = parsePartnerName(TextBody)
      const promoDate   = parsePromoDate(TextBody)
      const listSize    = parseListSize(TextBody)
      console.log('[inbound] Parsed —', { partnerName, promoDate, listSize })

      await db.swapEntry.create({
        data: {
          userId,
          promoType:       'swap',
          role:            'inbound',
          platform:        'bookclicker',
          confirmation:    'applied',
          myList:          '',
          partnerName:     partnerName ?? undefined,
          partnerListSize: listSize    ?? undefined,
          promoDate:       promoDate   ?? undefined,
          notes:           `Auto-imported from Postmark (${MessageID})`,
        },
      })
      console.log('[inbound] Created SwapEntry for new booking:', partnerName)
      return ok()
    }

    // ── Promo confirmation (stats came back) ────────────────────────────────
    if (subjectLower.includes('promo confirmation')) {
      console.log('[inbound] Classified as: promo confirmation')
      const partnerName = parsePartnerName(TextBody)
      const promoDate   = parsePromoDate(TextBody)
      const clicks      = parseClicks(TextBody)
      const impressions = parseImpressions(TextBody)
      const listSize    = parseListSize(TextBody)
      console.log('[inbound] Parsed —', { partnerName, promoDate, clicks, impressions, listSize })

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
        console.log('[inbound] Updated SwapEntry', entry.id, '→ approved')
      } else {
        console.log('[inbound] No matching SwapEntry found for', { partnerName, promoDate })
      }
      return ok()
    }

    // ── Swap request accepted ───────────────────────────────────────────────
    if (subjectLower.includes('swap request has been accepted')) {
      console.log('[inbound] Classified as: swap accepted')
      const partnerName = parsePartnerName(TextBody)
      const promoDate   = parsePromoDate(TextBody)
      console.log('[inbound] Parsed —', { partnerName, promoDate })

      const entry = await findSwapEntry(userId, partnerName, promoDate)
      if (entry) {
        await db.swapEntry.update({
          where: { id: entry.id },
          data: { confirmation: 'approved' },
        })
        console.log('[inbound] Updated SwapEntry', entry.id, '→ approved')
      } else {
        console.log('[inbound] No matching SwapEntry found for', { partnerName, promoDate })
      }
      return ok()
    }

    // ── Automatically cancelled ─────────────────────────────────────────────
    if (subjectLower.includes('automatically cancelled')) {
      console.log('[inbound] Classified as: cancelled')
      const partnerName = parsePartnerName(TextBody)
      const promoDate   = parsePromoDate(TextBody)
      console.log('[inbound] Parsed —', { partnerName, promoDate })

      const entry = await findSwapEntry(userId, partnerName, promoDate)
      if (entry) {
        await db.swapEntry.update({
          where: { id: entry.id },
          data: { confirmation: 'cancelled' },
        })
        console.log('[inbound] Updated SwapEntry', entry.id, '→ cancelled')
      } else {
        console.log('[inbound] No matching SwapEntry found for', { partnerName, promoDate })
      }
      return ok()
    }

    console.log('[inbound] Unrecognized subject — no action taken:', Subject)
  } catch (err) {
    console.error('[inbound] Error processing email (still returning 200):', err)
  }

  return ok()
}
