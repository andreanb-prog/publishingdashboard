// Postmark inbound webhook for newsletter swap email parsing.
// Postmark POSTs here when a forwarded BookClicker email arrives.
// Always returns 200 — Postmark will retry indefinitely on any other status.
//
// Inbound address: {POSTMARK_INBOUND_TOKEN}@inbound.postmarkapp.com

// Full processing logic lives in /api/email/inbound — re-export from there.
export { POST } from '@/app/api/email/inbound/route'
