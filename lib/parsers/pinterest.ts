// lib/parsers/pinterest.ts
import type { PinterestData, PinterestBoard, PinterestPin, PinterestWeeklyData } from '@/types'

export function parsePinterestFile(csvText: string): PinterestData {
  const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean)

  // Find the daily impressions data section
  const dateHeaderIdx = lines.findIndex(l => l.startsWith('Date,Impressions'))
  
  let weeklyData: PinterestWeeklyData[] = []
  let totalImpressions = 0

  if (dateHeaderIdx !== -1) {
    // Parse daily data
    const dailyData: { date: string; impressions: number }[] = []
    
    for (let i = dateHeaderIdx + 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line || line.startsWith('Data starting') || line.startsWith('Top')) break
      
      const parts = line.split(',')
      if (parts.length >= 1) {
        const date = parts[0]?.trim()
        const imp = parseInt(parts[1]?.trim() || '0', 10) || 0
        if (date && date.match(/\d{4}-\d{2}-\d{2}/)) {
          dailyData.push({ date, impressions: imp })
          totalImpressions += imp
        }
      }
    }

    // Group into weeks
    const weekMap = new Map<string, number>()
    for (const { date, impressions } of dailyData) {
      const d = new Date(date)
      const weekStart = new Date(d)
      weekStart.setDate(d.getDate() - d.getDay())
      const weekKey = weekStart.toISOString().split('T')[0]
      weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + impressions)
    }

    weeklyData = Array.from(weekMap.entries())
      .map(([week, impressions]) => ({ week, impressions, saves: 0 }))
      .sort((a, b) => a.week.localeCompare(b.week))
  }

  // Parse Top Boards section
  const boardHeaderIdx = lines.findIndex(l => l.includes('Pinterest Link,Impressions,Engagement'))
  const boards: PinterestBoard[] = []

  if (boardHeaderIdx !== -1) {
    for (let i = boardHeaderIdx + 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line || line.startsWith('"Top') || line.startsWith('Top Pins')) break
      
      // Handle quoted CSV
      const parts = line.replace(/^"|"$/g, '').split(',')
      if (parts[0]?.includes('pinterest.com/')) {
        boards.push({
          url: parts[0]?.trim() || '',
          impressions: parseInt(parts[1]?.trim() || '0', 10) || 0,
          saves: parseInt(parts[4]?.trim() || '0', 10) || 0,
          clicks: parseInt(parts[3]?.trim() || '0', 10) || 0,
        })
      }
    }
  }

  // Parse Top Pins section
  const pinHeaderIdx = lines.findIndex(l => l.includes('Pinterest Link,Content Type,Source'))
  const topPins: PinterestPin[] = []

  if (pinHeaderIdx !== -1) {
    for (let i = pinHeaderIdx + 1; i < lines.length; i++) {
      const line = lines[i]
      if (!line || line.startsWith('"Top')) break
      
      const parts = line.split(',')
      if (parts[0]?.includes('pinterest.com/pin/')) {
        topPins.push({
          url: parts[0]?.trim() || '',
          type: parts[1]?.trim() || 'Organic',
          impressions: parseInt(parts[4]?.trim() || '0', 10) || 0,
          saves: 0,
        })
      }
    }
  }

  const totalSaves = boards.reduce((s, b) => s + b.saves, 0)
  const totalClicks = boards.reduce((s, b) => s + b.clicks, 0)
  const pinCount = topPins.length
  const saveRate = totalImpressions > 0 ? (totalSaves / totalImpressions) * 100 : 0

  // Calculate account age from first impression date
  const firstDate = lines
    .slice(dateHeaderIdx + 1)
    .find(l => l.match(/\d{4}-\d{2}-\d{2},\d+/))
    ?.split(',')[0]
  
  let accountAge = 'New account'
  if (firstDate) {
    const weeks = Math.floor(
      (Date.now() - new Date(firstDate).getTime()) / (1000 * 60 * 60 * 24 * 7)
    )
    accountAge = weeks <= 1 ? 'Less than 1 week' : `~${weeks} weeks`
  }

  return {
    totalImpressions,
    totalSaves,
    totalClicks,
    pinCount,
    saveRate: Math.round(saveRate * 10) / 10,
    weeklyData,
    boards,
    topPins,
    accountAge,
  }
}
