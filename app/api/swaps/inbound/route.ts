// Postmark inbound webhook for newsletter swap email parsing.
// Postmark POSTs here when a forwarded BookClicker email arrives.
// Always returns 200 — Postmark will retry indefinitely on any other status.
//
// Per-user routing: the To address uses a mailbox hash (+tag):
//   {POSTMARK_INBOUND_TOKEN}+swaps-{userId}@inbound.postmarkapp.com
// Postmark extracts the tag and passes it back as `MailboxHash`.

// Full processing logic lives in /api/email/inbound — re-export from there.
export { POST } from '@/app/api/email/inbound/route'
