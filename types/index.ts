// types/index.ts

export interface ParseDiagnostics {
  rowCount: number
  sheetsFound: string[]
  sheetUsed: string
  columnsDetected: string[]
  skippedRows: number
  skipReasons: string[]
  firstParsedRow: Record<string, unknown> | null
  error: string | null
  strategyUsed?: string
}

export interface KdpRawRow {
  asin: string
  title: string
  date: string   // YYYY-MM-DD
  units: number
  kenp: number
  royalties: number
  format?: string
}

export interface KDPData {
  month: string
  totalRoyaltiesUSD: number
  totalUnits: number
  totalKENP: number
  books: BookData[]
  dailyUnits: DailyData[]
  dailyKENP: DailyData[]
  rowCount?: number
  diagnostics?: ParseDiagnostics
  summary: {
    paidUnits: number
    freeUnits: number
    paperbackUnits: number
  }
  rawSaleRows?: KdpRawRow[]
}

export interface BookData {
  title: string
  asin: string
  shortTitle: string
  units: number
  kenp: number
  royalties: number
  format?: 'ebook' | 'paperback'
}

export interface DailyData {
  date: string
  value: number
  book?: string
}

export interface MetaAd {
  name: string
  spend: number
  clicks: number
  impressions: number
  ctr: number
  cpc: number
  reach: number
  status: 'SCALE' | 'WATCH' | 'CUT' | 'DELETE' | 'LOW_DATA'
  // Optional — only present when included in the Meta CSV export
  uniqueClicks?: number
  uniqueCtr?: number
  frequency?: number
  results?: number
  costPerResult?: number
}

export interface MetaData {
  totalSpend: number
  totalClicks: number
  totalImpressions: number
  avgCTR: number
  avgCPC: number
  ads: MetaAd[]
  bestAd: MetaAd | null
  worstAds: MetaAd[]
}

export interface MailerLiteAutomation {
  name: string
  status: 'active' | 'paused'
  subscriberCount: number
  openRate: number
  clickRate: number
  health: 'green' | 'amber' | 'red'
}

export interface MailerLiteData {
  listSize: number
  openRate: number
  clickRate: number
  unsubscribes: number
  campaigns: MailerLiteCampaign[]
  automations?: MailerLiteAutomation[]
  sentCount?: number
  bouncedCount?: number
  groups?: { id: string; name: string; listSize: number; openRate: number; clickRate: number }[]
}

export interface MailerLiteCampaign {
  name: string
  sentAt: string
  openRate: number
  clickRate: number
  unsubscribes: number
}

export interface PinterestData {
  totalImpressions: number
  totalSaves: number
  totalClicks: number
  pinCount: number
  saveRate: number
  weeklyData: PinterestWeeklyData[]
  boards: PinterestBoard[]
  topPins: PinterestPin[]
  accountAge: string
}

export interface PinterestWeeklyData {
  week: string
  impressions: number
  saves: number
}

export interface PinterestBoard {
  url: string
  impressions: number
  saves: number
  clicks: number
}

export interface PinterestPin {
  url: string
  impressions: number
  saves: number
  type: string
}

export interface RankLog {
  id: string
  book: string
  asin: string
  rank: number
  date: string
  movement?: number
}

export interface RoasLog {
  id: string
  date: string
  spend: number
  earnings: number
  roas: number
  notes?: string
}

export interface PinterestLog {
  id: string
  weekEnding: string
  impressions: number
  saves: number
  clicks: number
  pinCount: number
  saveRate: number
  notes?: string
}

export interface CoachingInsight {
  priority: number
  type: 'RED' | 'AMBER' | 'GREEN'
  title: string
  body: string
  action?: string
  channel: 'kdp' | 'meta' | 'email' | 'swaps' | 'pinterest' | 'general'
  confidence?: 'high' | 'medium' | 'low'
}

export interface ChannelScore {
  channel: string
  status: 'GREEN' | 'AMBER' | 'RED' | 'NEW'
  headline: string
  subline: string
  metric: string
  badge: string
  storyBullets?: {
    win: string
    trend: string
    nextAction: string
  }
}

export interface ExecutiveSummary {
  headlineStat: string
  whatsWorking: string[]
  whereToStrengthen: string[]
  topActions: { label: string; href: string }[]
}

export interface CrossChannelPlan {
  scale: string[]
  fix: string[]
  cut: string[]
  test: string[]
}

export interface Analysis {
  id?: string
  month: string
  kdp?: KDPData
  meta?: MetaData
  mailerLite?: MailerLiteData
  pinterest?: PinterestData
  overallVerdict?: string
  insights: CoachingInsight[]
  channelScores: ChannelScore[]
  actionPlan: CoachingInsight[]
  executiveSummary?: ExecutiveSummary
  crossChannelPlan?: CrossChannelPlan
  generatedAt: string
}

export interface Task {
  id: string
  userId: string
  title: string
  description?: string | null
  priority: 'high' | 'medium' | 'low'
  status: 'todo' | 'done'
  dueDate?: string | null
  category?: string | null
  isAISuggested: boolean
  aiReason?: string | null
  assignee: string
  assignedTo?: string | null
  completedAt?: string | null
  createdAt: string
  updatedAt: string
}
