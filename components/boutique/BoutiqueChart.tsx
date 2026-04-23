'use client'
import { useEffect, useRef } from 'react'
import ChartJS from 'chart.js/auto'

interface BoutiqueChartProps {
  labels: string[]
  data: number[]
  comparisonData?: number[]
  height?: number
}

export function BoutiqueChart({ labels, data, comparisonData, height = 220 }: BoutiqueChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<ChartJS | null>(null)

  const maxVal  = data.length > 0 ? Math.max(...data, 1) : 1
  const peakIdx = data.indexOf(maxVal)

  useEffect(() => {
    if (!canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')!
    if (chartRef.current) chartRef.current.destroy()

    chartRef.current = new ChartJS(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Primary',
            data,
            borderColor: '#D97706',
            borderWidth: 2,
            tension: 0.4,
            fill: true,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            backgroundColor: (context: any) => {
              const { ctx: c, chartArea } = context.chart
              if (!chartArea) return 'rgba(217,119,6,0.08)'
              const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
              g.addColorStop(0, 'rgba(217,119,6,0.08)')
              g.addColorStop(1, 'rgba(217,119,6,0)')
              return g
            },
            pointRadius: data.map((_, i) => i === peakIdx ? 5 : 0),
            pointBackgroundColor: '#D97706',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointHoverRadius: 4,
          },
          ...(comparisonData ? [{
            label: 'Comparison',
            data: comparisonData,
            borderColor: '#6D3FD4',
            borderWidth: 1.5,
            borderDash: [5, 4],
            tension: 0.4,
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
          }] : []),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 400 },
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#fff',
            borderColor: '#E8E1D3',
            borderWidth: 1,
            titleColor: '#1E2D3D',
            bodyColor: '#6B7280',
            padding: 10,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: {
              color: 'rgba(30,45,61,0.4)',
              font: { family: 'Fraunces', style: 'italic', size: 10 } as any,
              maxRotation: 0,
            },
          },
          y: {
            grid: { color: 'rgba(232,225,211,0.6)', lineWidth: 1 },
            border: { display: false },
            ticks: {
              color: 'rgba(30,45,61,0.4)',
              font: { family: 'Fraunces', style: 'italic', size: 10 } as any,
            },
          },
        },
      } as any,
    })

    return () => { chartRef.current?.destroy() }
  }, [labels, data, comparisonData, peakIdx])

  return (
    <div style={{ height, position: 'relative' }}>
      <canvas ref={canvasRef} />
      {data.length > 0 && peakIdx >= 0 && (
        <div style={{
          position: 'absolute',
          top: 4,
          right: 8,
          fontFamily: 'var(--font-serif)',
          fontStyle: 'italic',
          fontSize: 11,
          color: '#D97706',
          pointerEvents: 'none',
        }}>
          Peak: {labels[peakIdx]} · {maxVal.toLocaleString()}
        </div>
      )}
    </div>
  )
}
