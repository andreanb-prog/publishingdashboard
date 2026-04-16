export interface ParsedChapter {
  chapterNumber: number
  title: string
  pov: string
  content: string
}

const CHAPTER_HEADER = /^#{1,2}\s+Chapter\s+\d+/i
const BARE_CHAPTER = /^Chapter\s+\d+/i
const HR = /^---+$/

const STRIP_PATTERNS = [
  /^#{1,4}\s+/, // markdown headers
  /^\*?(Revised|Draft|Edited|Opening hook|Summary|Closing cliffhanger):/i,
  /^---+$/,
  /^###\s+(Stillwater|Book)/i, // series/book title lines
]

function isChapterStart(line: string): boolean {
  return CHAPTER_HEADER.test(line) || BARE_CHAPTER.test(line)
}

function extractTitle(lines: string[]): string {
  // Look for a subtitle/location line after the header — skip date/POV lines
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim()
    if (!line) continue
    if (/^#{1,2}\s+Chapter/i.test(line)) continue
    if (/^Chapter\s+\d+/i.test(line)) continue
    if (/POV/i.test(line)) continue
    if (/^\d{4}|^(January|February|March|April|May|June|July|August|September|October|November|December)/i.test(line)) continue
    if (/^---+$/.test(line)) continue
    // Strip markdown heading prefix if present
    const cleaned = line.replace(/^#{1,4}\s+/, '').trim()
    if (cleaned) return cleaned
  }
  return ''
}

function extractPov(lines: string[]): string {
  for (let i = 0; i < Math.min(8, lines.length); i++) {
    const line = lines[i].trim()
    if (/POV/i.test(line) || /·\s+\w+'s\s+POV/i.test(line)) {
      return line.replace(/^#{1,4}\s+/, '').trim()
    }
  }
  return ''
}

function shouldStripLine(line: string): boolean {
  return STRIP_PATTERNS.some(p => p.test(line.trim()))
}

export function parseManuscriptIntoChapters(text: string): ParsedChapter[] {
  const lines = text.split('\n')
  const chapterStarts: number[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (isChapterStart(line)) {
      chapterStarts.push(i)
      continue
    }
    // HR followed within 3 lines by a chapter header
    if (HR.test(line)) {
      for (let j = i + 1; j <= Math.min(i + 3, lines.length - 1); j++) {
        if (isChapterStart(lines[j].trim())) {
          chapterStarts.push(j)
          break
        }
      }
    }
  }

  // Deduplicate (an HR detection might find the same header)
  const uniqueStarts = Array.from(new Set(chapterStarts)).sort((a, b) => a - b)

  if (uniqueStarts.length === 0) return []

  const chapters: ParsedChapter[] = []

  for (let c = 0; c < uniqueStarts.length; c++) {
    const start = uniqueStarts[c]
    const end = c + 1 < uniqueStarts.length ? uniqueStarts[c + 1] : lines.length
    const chapterLines = lines.slice(start, end)

    const title = extractTitle(chapterLines)
    const pov = extractPov(chapterLines)

    // Build content — strip header/metadata lines, keep prose, collapse blank runs
    const contentLines = chapterLines.filter(l => !shouldStripLine(l))
    const content = contentLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()

    chapters.push({
      chapterNumber: c + 1,
      title,
      pov,
      content,
    })
  }

  return chapters
}
