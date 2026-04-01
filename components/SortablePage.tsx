'use client'
// components/SortablePage.tsx
// Drag-and-drop section reordering. Sections persist order to /api/prefs.

import { useState, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export interface DraggableSection {
  id: string
  content: React.ReactNode
}

// ── Drag handle (6-dot grid) ──────────────────────────────────────────────────
function DragHandle({ theme }: { theme: 'light' | 'dark' }) {
  const dot = theme === 'dark' ? '#44403c' : '#c7c3c0'
  return (
    <div className="flex flex-col gap-[3px]">
      {[0, 1, 2].map(i => (
        <div key={i} className="flex gap-[3px]">
          <div className="w-[4px] h-[4px] rounded-full" style={{ background: dot }} />
          <div className="w-[4px] h-[4px] rounded-full" style={{ background: dot }} />
        </div>
      ))}
    </div>
  )
}

// ── Single sortable section ───────────────────────────────────────────────────
function SortableItem({
  id,
  children,
  theme,
}: {
  id: string
  children: React.ReactNode
  theme: 'light' | 'dark'
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        position: 'relative',
      }}
      className="group/drag"
    >
      {/* Drag handle — only visible on hover */}
      <button
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder section"
        className="absolute -left-7 top-0 h-full flex items-center justify-center opacity-0 group-hover/drag:opacity-60 hover:!opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
        style={{ width: 20, border: 'none', background: 'transparent', padding: 0 }}
      >
        <DragHandle theme={theme} />
      </button>
      {children}
    </div>
  )
}

// ── Main sortable container ───────────────────────────────────────────────────
export function SortablePage({
  page,
  sections,
  theme = 'light',
}: {
  page: string
  sections: DraggableSection[]
  theme?: 'light' | 'dark'
}) {
  const defaultOrder = sections.map(s => s.id)
  const [order,  setOrder]  = useState<string[]>(defaultOrder)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/prefs')
      .then(r => r.json())
      .then(d => {
        const saved: string[] | undefined = d.layoutPrefs?.[page]
        if (Array.isArray(saved) && saved.length > 0) {
          const known    = sections.map(s => s.id)
          const filtered = saved.filter(id => known.includes(id))
          const extras   = known.filter(id => !filtered.includes(id))
          setOrder([...filtered, ...extras])
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx   = order.indexOf(String(active.id))
    const newIdx   = order.indexOf(String(over.id))
    const newOrder = arrayMove(order, oldIdx, newIdx)
    setOrder(newOrder)
    fetch('/api/prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save-layout', page, order: newOrder }),
    }).catch(() => {})
  }

  const orderedSections = order
    .map(id => sections.find(s => s.id === id))
    .filter((s): s is DraggableSection => s != null)

  // Render in default order while loading (no layout flash)
  if (!loaded) {
    return (
      <div>
        {sections.map(s => <div key={s.id}>{s.content}</div>)}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={order} strategy={verticalListSortingStrategy}>
        <div>
          {orderedSections.map(section => (
            <SortableItem key={section.id} id={section.id} theme={theme}>
              {section.content}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
