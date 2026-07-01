export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ADMIN_EMAILS } from '@/lib/getSession'
import { getBrowserbaseConfig, browserbaseClient } from '@/lib/browserbase'

// GET — diagnostic endpoint to verify Browserbase env vars and SDK init.
// Returns JSON with env presence, partial key preview, and SDK init result.
// Admin-only: it creates billable Browserbase contexts and previews API keys.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email || !ADMIN_EMAILS.includes(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const apiKey = process.env.BROWSERBASE_API_KEY
  const projectId = process.env.BROWSERBASE_PROJECT_ID

  const result: Record<string, unknown> = {
    env: {
      BROWSERBASE_API_KEY: {
        present: !!apiKey,
        preview: apiKey ? apiKey.slice(0, 4) + '****' : null,
      },
      BROWSERBASE_PROJECT_ID: {
        present: !!projectId,
        preview: projectId ? projectId.slice(0, 4) + '****' : null,
      },
    },
    sdkInit: null,
    contextCreate: null,
  }

  const cfg = getBrowserbaseConfig()
  if (!cfg) {
    result.sdkInit = { ok: false, error: 'Missing env vars — cannot initialize SDK' }
    return NextResponse.json(result, { status: 200 })
  }

  // Try initializing the SDK client
  try {
    const bb = browserbaseClient(cfg)
    result.sdkInit = { ok: true, clientType: typeof bb }
  } catch (err) {
    result.sdkInit = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
    return NextResponse.json(result, { status: 200 })
  }

  // Try creating a context (the actual failing call in create-context/route.ts)
  try {
    const bb = browserbaseClient(cfg)
    const context = await bb.contexts.create({ projectId: cfg.projectId })
    result.contextCreate = {
      ok: true,
      contextId: context.id,
    }
    // Clean up — delete the test context so it doesn't accumulate
    try {
      await bb.contexts.delete(context.id)
      result.contextCreate = { ...(result.contextCreate as object), deleted: true }
    } catch {
      result.contextCreate = { ...(result.contextCreate as object), deleted: false, note: 'context created but delete failed' }
    }
  } catch (err) {
    result.contextCreate = {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5).join('\n') : null,
    }
  }

  return NextResponse.json(result, { status: 200 })
}
