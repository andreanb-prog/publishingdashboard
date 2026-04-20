// lib/adminAudit.ts
// Fire-and-forget helper — never throws, never blocks the caller.
import { db } from '@/lib/db'

export type AdminAction = 'started' | 'ended' | 'upload' | 'book_added'

export function logAdminAction(
  adminEmail: string,
  impersonatedEmail: string,
  action: AdminAction,
  metadata?: Record<string, unknown>
) {
  db.adminAuditLog
    .create({
      data: {
        adminEmail,
        impersonatedEmail,
        action,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadata: metadata ? (metadata as any) : undefined,
      },
    })
    .catch((err) => console.error('[adminAudit] log failed:', err))
}
