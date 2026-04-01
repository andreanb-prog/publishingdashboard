// types/index.ts

export interface KDPData {
  month: string
  totalRoyaltiesUSD: number
  totalUnits: number
  totalKENP: number
  books: BookData[]
  dailyUnits: DailyData[]
  dailyKENP: DailyData[]
  summary: {
    paidUnits: number
    freeUnits: number
    paperbackUnits: number
  }
}

export interface BookData {
  title: string
  asin: string
  shortTitle: string
  units: number
  kenp: number
  royalties: number
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

export interface MailerLiteData {
  listSize: number
  openRate: number
  clickRate: number
  unsubscribes: number
  campaigns: MailerLiteCampaign[]
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
}

export interface ChannelScore {
  channel: string
  status: 'GREEN' | 'AMBER' | 'RED' | 'NEW'
  headline: string
  subline: string
  metric: string
  badge: string
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
  generatedAt: string
}
