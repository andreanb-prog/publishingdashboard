'use client'
// app/dashboard/creative/CreativeHubTabs.tsx
import { useState } from 'react'
import { CreativeClient } from './CreativeClient'
import { CampaignClient } from './CampaignClient'

interface Book     { id: string; title: string; phase: string | null; colorCode: string | null }
interface Creative { id: string; name: string; angle: string | null; format: string; status: string;
                     [key: string]: unknown }
interface Campaign { id: string; [key: string]: unknown }

const TABS = [
  { key: 'creatives', label: 'Creatives' },
  { key: 'campaigns', label: 'Campaigns' },
] as const
type TabKey = typeof TABS[number]['key']

export function CreativeHubTabs({
  initialCreatives,
  initialCampaigns,
  books,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialCreatives: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialCampaigns: any[]
  books: Book[]
}) {
  const [activeTab, setActiveTab] = useState<TabKey>('creatives')

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Tab bar */}
      <div
        className="flex items-end gap-0 px-6"
        style={{
          background: '#FFFFFF',
          borderBottom: '0.5px solid #EEEBE6',
        }}
      >
        {TABS.map(tab => {
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="relative pb-3 pt-3 px-1 mr-6 text-[13px] font-semibold transition-colors"
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: active ? '2px solid #E9A020' : '2px solid transparent',
                color: active ? '#E9A020' : '#9CA3AF',
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'creatives' && (
        <CreativeClient initialCreatives={initialCreatives} books={books} />
      )}
      {activeTab === 'campaigns' && (
        <CampaignClient
          initialCampaigns={initialCampaigns}
          creatives={initialCreatives.map((c: Creative) => ({
            id: c.id as string,
            name: c.name as string,
            angle: c.angle as string | null,
            format: c.format as string,
            status: c.status as string,
          }))}
        />
      )}
    </div>
  )
}
