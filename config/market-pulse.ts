// config/market-pulse.ts
// Seed genres for Category Intelligence v2 — Market Pulse.
// ANDREA: edit freely. `bestsellerUrl` is the Amazon Kindle best-seller list to
// scrape (any zgbs URL works — swap in the exact browse node you want to track).
// Niches without a dedicated Amazon node (mafia, hockey) point at the closest
// parent node; the trope tagger separates them out of the parent list.

export type PulseGenre = {
  slug: string          // stable id, used as DB key — don't change after first scrape
  label: string         // display name
  group: 'romance' | 'mystery' | 'other'
  bestsellerUrl: string // Amazon best-seller (zgbs) URL, page 1
  // Optional focus tropes: when set, the pulse card highlights these first
  focusTropes?: string[]
}

export const PULSE_GENRES: PulseGenre[] = [
  {
    slug: 'contemporary-romance',
    label: 'Contemporary Romance',
    group: 'romance',
    bestsellerUrl: 'https://www.amazon.com/gp/bestsellers/digital-text/158566011',
  },
  {
    slug: 'small-town-romance',
    label: 'Small Town & Rural Romance',
    group: 'romance',
    // TODO(Andrea): verify node — Kindle eBooks > Romance > Small Town & Rural
    bestsellerUrl: 'https://www.amazon.com/gp/bestsellers/digital-text/9059886011',
    focusTropes: ['small town', 'second chance', 'protective'],
  },
  {
    slug: 'romantic-comedy',
    label: 'Romantic Comedy',
    group: 'romance',
    // TODO(Andrea): verify node — Kindle eBooks > Romance > Romantic Comedy
    bestsellerUrl: 'https://www.amazon.com/gp/bestsellers/digital-text/9059887011',
  },
  {
    slug: 'mafia-romance',
    label: 'Mafia / Dark Romance',
    group: 'romance',
    // No dedicated Amazon node — closest parent is Romantic Heroes > Criminals
    // & Outlaws. TODO(Andrea): verify node. Trope tagger isolates mafia titles.
    bestsellerUrl: 'https://www.amazon.com/gp/bestsellers/digital-text/24357607011',
    focusTropes: ['mafia', 'dark romance', 'forbidden', 'billionaire'],
  },
  {
    slug: 'sports-romance',
    label: 'Sports Romance (incl. Hockey)',
    group: 'romance',
    // TODO(Andrea): verify node — Kindle eBooks > Romance > Sports. Hockey has
    // no dedicated node; the trope tagger tracks 'hockey' inside this list.
    bestsellerUrl: 'https://www.amazon.com/gp/bestsellers/digital-text/6487844011',
    focusTropes: ['hockey', 'sports', 'grumpy sunshine'],
  },
  {
    slug: 'billionaire-romance',
    label: 'Billionaire Romance',
    group: 'romance',
    // TODO(Andrea): verify node — Romantic Heroes > Wealthy Men / Billionaires
    bestsellerUrl: 'https://www.amazon.com/gp/bestsellers/digital-text/11650048011',
    focusTropes: ['billionaire', 'fake dating', 'protective'],
  },
  {
    slug: 'cozy-mystery',
    label: 'Cozy Mystery',
    group: 'mystery',
    // TODO(Andrea): verify node — Kindle eBooks > Mystery > Cozy
    bestsellerUrl: 'https://www.amazon.com/gp/bestsellers/digital-text/7588851011',
    focusTropes: ['amateur sleuth', 'small town', 'culinary', 'animal companion'],
  },
]

// Trope taxonomy for the pulse tagger. Superset of the Ad Naming System list
// (roadmap: Creative Intelligence) so category data and ad data share a
// vocabulary — that shared vocabulary is the moat.
export const PULSE_TROPES = [
  // romance
  'protective', 'grumpy sunshine', 'enemies to lovers', 'fake dating',
  'second chance', 'forbidden', 'secret baby', 'small town', 'billionaire',
  'mafia', 'dark romance', 'sports', 'hockey', 'single dad', 'single mom',
  'doctor', 'cowboy', 'military', 'workplace', 'friends to lovers',
  'age gap', 'marriage of convenience', 'bodyguard', 'brothers best friend',
  'why choose', 'paranormal shifter', 'holiday',
  // cozy mystery
  'amateur sleuth', 'culinary', 'animal companion', 'craft or hobby',
  'paranormal cozy', 'seaside', 'bookshop or library',
] as const

// ── BSR → estimated sales/day (Kindle US) ────────────────────────────────────
// Piecewise log-linear interpolation over community-standard anchor points.
// ANDREA: these anchors are editable — as real user KDP data accumulates we can
// calibrate this curve from actual (rank, sales) pairs, which no competitor has.
const BSR_ANCHORS: [number, number][] = [
  [1, 3500], [5, 2200], [10, 1600], [50, 750], [100, 450],
  [500, 200], [1000, 120], [5000, 45], [10000, 25],
  [50000, 6], [100000, 2.5], [500000, 0.3], [1000000, 0.1],
]

export function bsrToSalesPerDay(bsr: number): number {
  if (!Number.isFinite(bsr) || bsr < 1) return 0
  const a = BSR_ANCHORS
  if (bsr <= a[0][0]) return a[0][1]
  if (bsr >= a[a.length - 1][0]) return a[a.length - 1][1]
  for (let i = 0; i < a.length - 1; i++) {
    const [x1, y1] = a[i]; const [x2, y2] = a[i + 1]
    if (bsr >= x1 && bsr <= x2) {
      const t = (Math.log(bsr) - Math.log(x1)) / (Math.log(x2) - Math.log(x1))
      return Math.round((y1 * Math.pow(y2 / y1, t)) * 10) / 10
    }
  }
  return 0
}
