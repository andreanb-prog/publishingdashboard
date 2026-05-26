export const SOURCE_PRIORITY: Record<string, number> = {
  csv: 1,
  extension: 2,
  manual: 3,
}

export function shouldOverwrite(existingSource: string | null, incomingSource: string): boolean {
  const existingPriority = SOURCE_PRIORITY[existingSource ?? 'manual'] ?? 99
  const incomingPriority = SOURCE_PRIORITY[incomingSource] ?? 99
  return incomingPriority <= existingPriority
}
