export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Postmark inbound email webhook — always return 200, never 4xx/5xx (it will retry forever)

// GET handler — Postmark may do a verification ping before sending emails
export async function GET() {
  console.log('[INBOUND] GET ping received')
  return NextResponse.json({ ok: true }, { status: 200 })
}

interface PostmarkAttachment {
  Name:        string
  Content:     string  // base64-encoded
  ContentType: string
  ContentLength: number
}

interface PostmarkInboundPayload {
  From:        string
  Subject:     string
  TextBody:    string
  HtmlBody:    string
  MailboxHash: string  // extracted from +tag in To address: "swaps-{userId}"
  MessageID:   string
  Attachments: PostmarkAttachment[]
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

// ── .eml parser — extract Subject, From, and plain-text body ─────────────────

function parseEml(raw: string): { subject: string; from: string; body: string } {
  const lines = raw.replace(/\r\n/g, '\n').split('\n')
  let subject = ''
  let from    = ''
  let inHeaders = true
  const bodyLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (inHeaders) {
      // Blank line separates headers from body
      if (line.trim() === '') {
        inHeaders = false
        continue
      }
      // Handle folded headers (continuation lines start with whitespace)
      if (/^[ \t]/.test(line)) continue

      const subjectMatch = line.match(/^Subject:\s*(.*)/i)
      if (subjectMatch) { subject = subjectMatch[1].trim(); continue }

      const fromMatch = line.match(/^From:\s*(.*)/i)
      if (fromMatch) { from = fromMatch[1].trim(); continue }
    } else {
      bodyLines.push(line)
    }
  }

  return { subject, from, body: bodyLines.join('\n') }
}

// ── Find a SwapEntry by partnerName + promoDate within ±3 days ───────────────

async function findSwapEntry(userId: string, partnerName: string | null, promoDate: Date | null) {
  if (!partnerName && !promoDate) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId }
  if (partnerName) where.partnerName = { contains: partnerName, mode: 'insensitive' }
  if (promoDate) {
    const low  = new Date(promoDate); low.setDate(low.getDate() - 3)
    const high = new Date(promoDate); high.setDate(high.getDate() + 3)
    where.promoDate = { gte: low, lte: high }
  }

  return db.swapEntry.findFirst({ where })
}

// ── Classify and process a single email ──────────────────────────────────────

async function processEmail(
  userId: string,
  subject: string,
  body: string,
  sourceLabel: string,  // for logging: "TextBody" or "attachment: foo.eml"
) {
  const subjectLower = subject.toLowerCase()

  // ── New booking ───────────────────────────────────────────────────────────
  if (subjectLower.includes('new booking')) {
    console.log(`[INBOUND] [${sourceLabel}] Classified: new booking`)
    const partnerName = parsePartnerName(body)
    const promoDate   = parsePromoDate(body)
    const listSize    = parseListSize(body)
    console.log(`[INBOUND] [${sourceLabel}] Parsed —`, { partnerName, promoDate, listSize })

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
        notes:           `Auto-imported via ${sourceLabel}`,
      },
    })
    console.log(`[INBOUND] [${sourceLabel}] Created SwapEntry:`, partnerName)
    return
  }

  // ── Promo confirmation ────────────────────────────────────────────────────
  if (subjectLower.includes('promo confirmation')) {
    console.log(`[INBOUND] [${sourceLabel}] Classified: promo confirmation`)
    const partnerName = parsePartnerName(body)
    const promoDate   = parsePromoDate(body)
    const clicks      = parseClicks(body)
    const impressions = parseImpressions(body)
    const listSize    = parseListSize(body)
    console.log(`[INBOUND] [${sourceLabel}] Parsed —`, { partnerName, promoDate, clicks, impressions, listSize })

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
      console.log(`[INBOUND] [${sourceLabel}] Updated SwapEntry ${entry.id} → approved`)
    } else {
      console.log(`[INBOUND] [${sourceLabel}] No matching SwapEntry for`, { partnerName, promoDate })
    }
    return
  }

  // ── Swap accepted ─────────────────────────────────────────────────────────
  if (subjectLower.includes('swap request has been accepted')) {
    console.log(`[INBOUND] [${sourceLabel}] Classified: swap accepted`)
    const partnerName = parsePartnerName(body)
    const promoDate   = parsePromoDate(body)

    const entry = await findSwapEntry(userId, partnerName, promoDate)
    if (entry) {
      await db.swapEntry.update({ where: { id: entry.id }, data: { confirmation: 'approved' } })
      console.log(`[INBOUND] [${sourceLabel}] Updated SwapEntry ${entry.id} → approved`)
    } else {
      console.log(`[INBOUND] [${sourceLabel}] No matching SwapEntry for`, { partnerName, promoDate })
    }
    return
  }

  // ── Automatically cancelled ───────────────────────────────────────────────
  if (subjectLower.includes('automatically cancelled')) {
    console.log(`[INBOUND] [${sourceLabel}] Classified: cancelled`)
    const partnerName = parsePartnerName(body)
    const promoDate   = parsePromoDate(body)

    const entry = await findSwapEntry(userId, partnerName, promoDate)
    if (entry) {
      await db.swapEntry.update({ where: { id: entry.id }, data: { confirmation: 'cancelled' } })
      console.log(`[INBOUND] [${sourceLabel}] Updated SwapEntry ${entry.id} → cancelled`)
    } else {
      console.log(`[INBOUND] [${sourceLabel}] No matching SwapEntry for`, { partnerName, promoDate })
    }
    return
  }

  console.log(`[INBOUND] [${sourceLabel}] Unrecognized subject — no action:`, subject)
}

// ── Auto-detect BookClicker / BookFunnel emails → create Swap record ─────────

function parseBookTitle(body: string): string | null {
  const m = body.match(/(?:Book|Title):\s*(.+)/i)
  return m ? m[1].trim() : null
}

async function detectAndCreateSwap(
  userId: string,
  subject: string,
  body: string,
  from: string,
) {
  const fromLower = from.toLowerCase()
  const subjectLower = subject.toLowerCase()

  let source: 'bookclicker' | 'bookfunnel' | null = null
  if (fromLower.includes('bookclicker') || subjectLower.includes('bookclicker')) {
    source = 'bookclicker'
  } else if (fromLower.includes('bookfunnel') || subjectLower.includes('bookfunnel')) {
    source = 'bookfunnel'
  }

  if (!source) return

  // Only act on confirmation-type emails
  const isConfirmation =
    subjectLower.includes('confirm') ||
    subjectLower.includes('accepted') ||
    subjectLower.includes('approved') ||
    subjectLower.includes('booking')
  if (!isConfirmation) return

  const partnerName = parsePartnerName(body)
  const bookTitle = parseBookTitle(body)
  const promoDate = parsePromoDate(body)

  if (!partnerName && !bookTitle) return

  try {
    await db.swap.create({
      data: {
        userId,
        partnerName: partnerName ?? 'Unknown partner',
        bookTitle: bookTitle ?? 'Unknown title',
        promoDate: promoDate ?? new Date(),
        direction: 'they_promote', // inbound confirmation = they confirmed they'll promote you
        status: 'booked',
        source,
      },
    })
    console.log(`[INBOUND] swap auto-created from ${source}:`, { partnerName, bookTitle, promoDate })
  } catch (err) {
    console.error('[INBOUND] Failed to auto-create Swap record:', err)
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  console.log('[INBOUND] POST received from Postmark')

  let payload: PostmarkInboundPayload

  try {
    payload = await req.json()
  } catch {
    console.error('[INBOUND] Failed to parse Postmark payload')
    return ok()
  }

  const {
    From        = '',
    Subject     = '',
    TextBody    = '',
    MailboxHash = '',
    MessageID   = '',
    Attachments = [],
  } = payload

  console.log('[INBOUND] Email details —', { MessageID, From, Subject, MailboxHash, attachmentCount: Attachments.length })

  // ── Identify user from MailboxHash: "swaps-{userId}" ─────────────────────
  let user: { id: string; email: string | null } | null = null

  const hashMatch = MailboxHash.match(/^swaps-(.+)$/i)
  if (hashMatch) {
    const userId = hashMatch[1]
    console.log('[INBOUND] Resolved userId from MailboxHash:', userId)
    user = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true } })
    if (!user) console.log('[INBOUND] No user found for id:', userId)
  }

  // ── Beta fallback: no MailboxHash — find first active user ───────────────
  if (!user) {
    console.log('[INBOUND] No userId in MailboxHash — trying beta fallback. Hash was:', MailboxHash)
    user = await db.user.findFirst({
      where: { metaAccessToken: { not: null } },
      select: { id: true, email: true },
    })
    if (user) {
      console.log('[INBOUND] Beta fallback resolved user:', user.email)
    }
  }

  if (!user) {
    console.log('[INBOUND] No user found — skipping email')
    return ok()
  }
  console.log('[INBOUND] User found:', user.email)

  const userId = user.id

  try {
    // ── Auto-detect BookClicker / BookFunnel confirmation → create Swap record ──
    await detectAndCreateSwap(userId, Subject, TextBody, From)

    // ── Process main email body ───────────────────────────────────────────
    if (TextBody.trim()) {
      await processEmail(userId, Subject, TextBody, `TextBody (${MessageID})`)
    }

    // ── Process .eml attachments (bulk forwarded emails) ──────────────────
    const emlAttachments = Attachments.filter(
      a => a.ContentType === 'message/rfc822' || a.Name.toLowerCase().endsWith('.eml')
    )

    if (emlAttachments.length > 0) {
      console.log(`[INBOUND] Processing ${emlAttachments.length} .eml attachment(s)`)
    }

    for (const attachment of emlAttachments) {
      console.log('[INBOUND] Processing .eml attachment:', attachment.Name)
      try {
        const raw     = Buffer.from(attachment.Content, 'base64').toString('utf-8')
        const parsed  = parseEml(raw)
        console.log('[INBOUND] .eml parsed —', { subject: parsed.subject, from: parsed.from })
        await processEmail(userId, parsed.subject, parsed.body, `attachment: ${attachment.Name}`)
      } catch (err) {
        console.error('[INBOUND] Failed to process attachment:', attachment.Name, err)
        // Continue processing remaining attachments
      }
    }
  } catch (err) {
    console.error('[INBOUND] Error processing email (still returning 200):', err)
  }

  return ok()
}
