// lib/chartConfig.ts — Shared chart system for AuthorDash
// ALL Chart.js charts must import from here. No inline Chart.js config anywhere.

export const CHART_COLORS = {
  coral:  '#F97B6B',
  amber:  '#E9A020',
  sage:   '#6EBF8B',
  plum:   '#8B5CF6',
  teal:   '#5BBFB5',
  sky:    '#60A5FA',
  peach:  '#F4A261',
  navy:   '#1E2D3D',
  muted:  'rgba(30,45,61,0.4)',
  grid:   'rgba(30,45,61,0.06)',
}

export const BASE_CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 600, easing: 'easeInOutQuart' },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1E2D3D',
      titleColor: 'rgba(255,255,255,0.7)',
      bodyColor: '#ffffff',
      padding: 12,
      cornerRadius: 8,
      titleFont: { family: 'Plus Jakarta Sans', size: 12, weight: '500' },
      bodyFont: { family: 'Plus Jakarta Sans', size: 13, weight: '500' },
      boxPadding: 6,
      usePointStyle: true,
      pointStyle: 'circle',
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: {
        color: 'rgba(30,45,61,0.6)',
        font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' },
        maxTicksLimit: 8,
      },
    },
    y: {
      grid: { color: 'rgba(30,45,61,0.06)' },
      border: { display: false },
      ticks: {
        color: 'rgba(30,45,61,0.55)',
        font: { family: 'Plus Jakarta Sans', size: 11 },
      },
    },
  },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function areaDataset(data: number[], color: string, label: string): any {
  return {
    type: 'line',
    label,
    data,
    borderColor: color,
    borderWidth: 2,
    fill: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    backgroundColor: (ctx: any) => {
      const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 200)
      g.addColorStop(0, color + '40')
      g.addColorStop(1, color + '04')
      return g
    },
    tension: 0.4,
    pointRadius: 0,
    pointHoverRadius: 5,
    pointHoverBackgroundColor: color,
    pointHoverBorderColor: '#fff',
    pointHoverBorderWidth: 2,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function barDataset(data: number[], color: string, label: string): any {
  return {
    type: 'bar',
    label,
    data,
    backgroundColor: color + 'CC',
    hoverBackgroundColor: color,
    borderRadius: { topLeft: 4, topRight: 4 },
    borderSkipped: 'bottom',
  }
}

/** Centered rolling average. window=7 means ±3 days around each point. */
export function rollingAverage(data: number[], window = 7): number[] {
  if (data.length === 0) return []
  const half = Math.floor(window / 2)
  return data.map((_, i) => {
    const slice = data.slice(Math.max(0, i - half), Math.min(data.length, i + half + 1))
    return Math.round(slice.reduce((a, b) => a + b, 0) / slice.length)
  })
}

/** Returns point overrides that highlight the peak value. Color defaults to amber. */
export function peakPoints(data: number[], color = CHART_COLORS.amber) {
  if (data.length === 0) {
    return { pointRadius: [], pointBackgroundColor: color, pointBorderColor: '#fff', pointBorderWidth: 2 }
  }
  const max = Math.max(...data)
  return {
    pointRadius: data.map(v => v === max ? 5 : 0),
    pointBackgroundColor: color,
    pointBorderColor: '#fff',
    pointBorderWidth: 2,
  }
}
