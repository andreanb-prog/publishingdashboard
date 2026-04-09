// lib/auditPrompts.ts — AI audit prompt templates for the Chapter Audit Engine

export type AuditType = 'ku_pacing' | 'heat_map' | 'emotional_arc'

export interface AuditFinding {
  quote: string
  category: 'pacing' | 'heat' | 'emotional' | 'dialogue' | 'structure'
  severity: 'flag' | 'note' | 'praise'
  comment: string
}

export const AUDIT_TYPE_LABELS: Record<AuditType, string> = {
  ku_pacing: 'KU Pacing',
  heat_map: 'Heat Map',
  emotional_arc: 'Emotional Arc',
}

const SHARED_INSTRUCTIONS = `Return ONLY a JSON array of findings. Each finding must have:
- quote: exact text passage from the chapter (verbatim, 10-50 words)
- category: one of "pacing", "heat", "emotional", "dialogue", "structure"
- severity: "flag" (needs attention) | "note" (consider this) | "praise" (working well)
- comment: specific, actionable observation (1-3 sentences max)

Be specific. Quote actual lines. Do not summarize the chapter. Do not be generic.
Return JSON only — no preamble, no markdown fences.
Aim for 8-15 findings per chapter. Include at least 2 praise findings if the writing has strengths.`

const KU_PACING_CHECKLIST = `You are auditing for KU (Kindle Unlimited) pacing. KU authors need to keep readers engaged page-to-page because revenue depends on pages read.

Check for:
- Chapter length appropriate for KU (3,000-6,000 words sweet spot) — flag if too long or too short
- Each scene has a clear purpose — advances plot, relationship, or character growth
- Scene breaks used effectively — not too many, not dragging
- Chapter ending: does it create a reason to turn the page? Rate the hook strength
- Opening hook strength — are the first 200 words compelling?
- Any scenes that could be cut without loss
- Anywhere the pacing stalls (too much internal monologue, over-described settings, info dumps)
- Dialogue pacing — conversations that run too long without action or internalization`

const HEAT_MAP_CHECKLIST = `You are auditing romantic/sexual tension escalation for slow-burn contemporary romance.

Check for:
- Physical awareness moments — are they landing with specificity?
- Proximity beats — close physical distance, charged interactions
- Slow-burn consistency — is tension building chapter over chapter or plateauing?
- Touch moments and their weight — do they feel earned?
- Dialogue with subtext — what's said vs. what's meant
- Any moments where heat drops unexpectedly or tension is lost
- Whether the romantic tension is earned or rushed
- Internal reactions to the love interest — body language, racing thoughts, denial
- The push-pull dynamic — are both attraction and resistance present?`

const EMOTIONAL_ARC_CHECKLIST = `You are auditing the character's emotional journey through this chapter.

Check for:
- Does the POV character have an internal shift by chapter end?
- Are emotional beats landed before plot moves forward?
- Internal monologue — too much (slows pacing) or too little (feels flat)?
- Unearned resolution — does something get resolved before the reader feels the tension?
- Character consistency — does the character act like themselves given their established personality?
- Vulnerability moments — are they specific enough to land with the reader?
- Emotional specificity — are feelings named with precision, not vague cliches?
- Does the chapter connect to the character's larger wound/fear/want?`

export function buildAuditSystemPrompt(
  auditType: AuditType,
  bookTitle: string,
  chapterNumber: number,
  chapterTitle: string,
  wordCount: number,
): string {
  const checklist =
    auditType === 'ku_pacing' ? KU_PACING_CHECKLIST :
    auditType === 'heat_map' ? HEAT_MAP_CHECKLIST :
    EMOTIONAL_ARC_CHECKLIST

  return `You are a developmental editor specializing in contemporary romance. You are auditing Chapter ${chapterNumber}${chapterTitle ? ` ("${chapterTitle}")` : ''} of "${bookTitle}".

Chapter word count: ${wordCount.toLocaleString()} words.

${checklist}

${SHARED_INSTRUCTIONS}`
}
