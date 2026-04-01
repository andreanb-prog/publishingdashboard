// lib/coachTitle.ts

const COACH_TITLES = [
  'Your marketing coach says',
  'Your data sensei says',
  'Your book guru says',
  'Your publishing guide says',
  'Your numbers whisperer says',
  'Your royalty oracle says',
  'Your shelf strategist says',
  'Your page read prophet says',
  'Your launch advisor says',
  'Your higher consciousness says',
  'Your book fairy godmother says',
  'Your chart reader says',
]

export function getCoachTitle(seed?: string): string {
  if (seed) {
    const index = seed.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % COACH_TITLES.length
    return COACH_TITLES[index]
  }
  return COACH_TITLES[Math.floor(Math.random() * COACH_TITLES.length)]
}
