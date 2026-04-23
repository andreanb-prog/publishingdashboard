'use client'
import React from 'react'

export interface BoutiqueTableColumn<T> {
  key: string
  header: string
  numeric?: boolean
  render?: (row: T, i: number) => React.ReactNode
}

interface BoutiqueTableProps<T> {
  columns: BoutiqueTableColumn<T>[]
  rows: T[]
  getKey?: (row: T, i: number) => string
}

export function BoutiqueTable<T extends object>({ columns, rows, getKey }: BoutiqueTableProps<T>) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key} style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontStyle: 'italic',
              color: '#6B7280',
              textAlign: col.numeric ? 'right' : 'left',
              padding: '10px 12px',
              borderBottom: '1px solid #E8E1D3',
              whiteSpace: 'nowrap',
              fontWeight: 500,
            }}>
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={getKey ? getKey(row, i) : i}>
            {columns.map(col => {
              const cellValue = (row as Record<string, unknown>)[col.key]
              return (
                <td key={col.key} style={{
                  fontFamily: col.numeric ? 'var(--font-serif)' : 'var(--font-sans)',
                  fontSize: col.numeric ? 14 : 13,
                  fontWeight: col.numeric ? 600 : 400,
                  color: col.numeric ? '#1E2D3D' : '#374151',
                  textAlign: col.numeric ? 'right' : 'left',
                  padding: '10px 12px',
                  borderBottom: '1px solid #EEEBE6',
                }}>
                  {col.render ? col.render(row, i) : String(cellValue ?? '')}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
