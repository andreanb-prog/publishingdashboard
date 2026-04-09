// Shared types for the Writing Notebook feature
export interface WorkbookData { [key: string]: string }
export type ChapterStatus = 'draft' | 'complete' | 'needs_edit' | 'empty'
export interface ChapterMeta { count: number; titles: string[]; statuses: ChapterStatus[] }
export interface StyleGuide {
  niche?: string; pov?: string; tense?: string
  totalWordCount?: string; chapterWordCount?: string
  tropes?: string; personalStylePreferences?: string
  killList?: { word: string; scope: 'global' | 'book' }[]
  aiRules?: { antiSlopEnabled: boolean; writingFormulaEnabled: boolean }
}
