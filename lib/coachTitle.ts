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
  'Your bestseller whisperer says',
  'Your author strategist says',
  'Your ink and data oracle says',
]

export function getCoachTitle(): string {
  return COACH_TITLES[Math.floor(Math.random() * COACH_TITLES.length)]
}
