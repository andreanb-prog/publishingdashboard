'use client'
// components/CategoryTagInput.tsx
// Multi-category tag input with autocomplete. Up to 8 tags per book.
// Free text always wins — suggestions are just convenience.

import { useState, useRef, useEffect, useId } from 'react'

export const CATEGORY_GROUPS: { group: string; categories: string[] }[] = [
  {
    group: 'Romance',
    categories: [
      'Contemporary Romance',
      'Romantic Suspense',
      'Historical Romance',
      'Western Romance',
      'Small Town Romance',
      'Second Chance Romance',
      'Enemies to Lovers Romance',
      'Fake Dating Romance',
      'Forced Proximity Romance',
      'Sports Romance',
      'Military Romance',
      'Medical Romance',
      'Office Romance',
      'Age Gap Romance',
      'Reverse Harem Romance',
      'Dark Romance',
      'Billionaire Romance',
      'Royalty Romance',
      'Holiday Romance',
      'Clean & Wholesome Romance',
      'Inspirational Romance',
      'LGBTQ+ Romance',
      'Interracial Romance',
      'Plus Size Romance',
      'New Adult & College Romance',
    ],
  },
  {
    group: 'Mafia & Dark Romance',
    categories: [
      'Mafia Romance',
      'Dark Mafia Romance',
      'Cartel Romance',
      'Organized Crime Romance',
      'Forbidden Dark Romance',
      'Captive Romance',
      'Bully Romance',
    ],
  },
  {
    group: 'Paranormal Romance',
    categories: [
      'Paranormal Romance',
      'Vampire Romance',
      'Werewolf Romance',
      'Shifter Romance',
      'Witch Romance',
      'Fae Romance',
      'Dragon Romance',
      'Demon Romance',
      'Angel Romance',
      'Ghost Romance',
      'Psychic Romance',
      'Fantasy Romance',
      'Dark Fantasy Romance',
    ],
  },
  {
    group: 'Cozy Mystery',
    categories: [
      'Cozy Mystery',
      'Culinary Cozy Mystery',
      'Pet Cozy Mystery',
      'Craft Cozy Mystery',
      'Bookshop Cozy Mystery',
      'Paranormal Cozy Mystery',
      'Small Town Cozy Mystery',
    ],
  },
]

export const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap(g => g.categories)

const MAX_TAGS = 8

export function CategoryTagInput({
  value,
  onChange,
  dark = false,
}: {
  value: string[]
  onChange: (v: string[]) => void
  /** Set true for dark-theme pages (rank tracker) */
  dark?: boolean
}) {
  const [inputVal,    setInputVal]    = useState('')
  const [open,        setOpen]        = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)
  const uid = useId()

  const atMax = value.length >= MAX_TAGS

  // Filter suggestions — exclude already-selected
  const trimmed = inputVal.trim()
  const filtered = (trimmed
    ? ALL_CATEGORIES.filter(c => c.toLowerCase().includes(trimmed.toLowerCase()))
    : ALL_CATEGORIES
  ).filter(c => !value.includes(c))

  const filteredGroups = CATEGORY_GROUPS
    .map(g => ({ ...g, categories: g.categories.filter(c => filtered.includes(c)) }))
    .filter(g => g.categories.length > 0)

  const flatFiltered = filteredGroups.flatMap(g => g.categories)

  // Custom entry row — show when user typed something not in the list
  const showCustom = trimmed.length > 0
    && !ALL_CATEGORIES.some(c => c.toLowerCase() === trimmed.toLowerCase())
    && !value.includes(trimmed)

  const totalOptions = flatFiltered.length + (showCustom ? 1 : 0)

  function addTag(cat: string) {
    const trimmedCat = cat.trim()
    if (!trimmedCat || value.includes(trimmedCat) || value.length >= MAX_TAGS) return
    onChange([...value, trimmedCat])
    setInputVal('')
    setOpen(false)
    setHighlighted(-1)
    inputRef.current?.focus()
  }

  function removeTag(cat: string) {
    onChange(value.filter(c => c !== cat))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !inputVal && value.length > 0) {
      removeTag(value[value.length - 1])
      return
    }
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true)
      return
    }
    if (e.key === 'Escape') { setOpen(false); setHighlighted(-1); return }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(h => Math.min(h + 1, totalOptions - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(h => Math.max(h - 1, -1))
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      if (highlighted >= 0 && highlighted < flatFiltered.length) {
        addTag(flatFiltered[highlighted])
      } else if (showCustom && (highlighted === flatFiltered.length || highlighted === -1) && trimmed) {
        addTag(trimmed)
      } else if (trimmed) {
        addTag(trimmed)
      }
    }
  }

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlighted >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-idx="${highlighted}"]`) as HTMLElement
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [highlighted])

  // Style tokens
  const tagBg      = dark ? 'rgba(233,160,32,0.18)' : 'rgba(233,160,32,0.12)'
  const tagColor   = dark ? '#fbbf24'               : '#92400e'
  const tagRemove  = dark ? 'rgba(255,255,255,0.4)' : '#a16207'
  const inputBg    = dark ? 'rgba(255,255,255,0.06)' : '#fff'
  const inputBorder = dark ? 'rgba(255,255,255,0.12)' : '#e7e5e4'
  const inputColor  = dark ? '#d6d3d1'               : '#0d1f35'
  const inputPlaceholder = dark ? 'rgba(255,255,255,0.3)' : undefined
  const dropdownBg  = dark ? '#1c1917'               : '#fff'
  const dropdownBorder = dark ? '#44403c'            : '#e7e5e4'
  const groupHeaderBg  = dark ? '#292524'            : '#fafaf9'
  const groupHeaderColor = dark ? '#57534e'          : '#a8a29e'
  const itemColor   = dark ? '#d6d3d1'               : '#44403c'
  const highlightBg = dark ? 'rgba(233,160,32,0.15)' : '#fef3c7'
  const highlightColor = dark ? '#fbbf24'            : '#0d1f35'
  const customColor = dark ? '#fbbf24'               : '#e9a020'

  let globalIdx = 0

  return (
    <div>
      {/* Tag list + input */}
      <div
        className="flex flex-wrap gap-1.5 rounded-lg px-2.5 py-2 cursor-text min-h-[40px]"
        style={{ background: inputBg, border: `1px solid ${inputBorder}` }}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map(cat => (
          <span
            key={cat}
            className="flex items-center gap-1 text-[11.5px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: tagBg, color: tagColor }}
          >
            {cat}
            <button
              type="button"
              onClick={e => { e.stopPropagation(); removeTag(cat) }}
              className="leading-none hover:opacity-70 transition-opacity"
              style={{ color: tagRemove, fontSize: 13, lineHeight: 1, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              aria-label={`Remove ${cat}`}
            >
              ×
            </button>
          </span>
        ))}

        {!atMax && (
          <div className="relative flex-1 min-w-[120px]">
            <input
              ref={inputRef}
              id={uid}
              type="text"
              value={inputVal}
              onChange={e => { setInputVal(e.target.value); setOpen(true); setHighlighted(-1) }}
              onFocus={() => setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onKeyDown={handleKeyDown}
              placeholder={value.length === 0 ? 'Type or choose a category…' : 'Add another…'}
              autoComplete="off"
              className="w-full bg-transparent outline-none text-[13px]"
              style={{
                color: inputColor,
                caretColor: inputColor,
                ...(dark && inputPlaceholder
                  ? ({ '--placeholder-color': inputPlaceholder } as React.CSSProperties)
                  : {}),
              }}
            />

            {open && totalOptions > 0 && (
              <div
                ref={listRef}
                className="absolute z-50 left-0 mt-1 rounded-xl shadow-xl overflow-y-auto"
                style={{
                  maxHeight: 280,
                  background: dropdownBg,
                  border: `1px solid ${dropdownBorder}`,
                  top: '100%',
                  minWidth: 220,
                  width: 'max-content',
                  maxWidth: 320,
                }}
              >
                {filteredGroups.map(group => (
                  <div key={group.group}>
                    <div
                      className="px-3 py-1.5 text-[9.5px] font-bold uppercase tracking-[1.2px]"
                      style={{ color: groupHeaderColor, background: groupHeaderBg, borderBottom: `1px solid ${dropdownBorder}` }}
                    >
                      {group.group}
                    </div>
                    {group.categories.map(cat => {
                      const idx = globalIdx++
                      const isHl = idx === highlighted
                      return (
                        <div
                          key={cat}
                          data-idx={idx}
                          onMouseDown={() => addTag(cat)}
                          onMouseEnter={() => setHighlighted(idx)}
                          className="px-3 py-2 text-[13px] cursor-pointer transition-colors duration-75"
                          style={{
                            color: isHl ? highlightColor : itemColor,
                            background: isHl ? highlightBg : 'transparent',
                            fontWeight: isHl ? 600 : 400,
                          }}
                        >
                          {cat}
                        </div>
                      )
                    })}
                  </div>
                ))}

                {showCustom && (
                  <div
                    data-idx={flatFiltered.length}
                    onMouseDown={() => addTag(trimmed)}
                    onMouseEnter={() => setHighlighted(flatFiltered.length)}
                    className="px-3 py-2.5 text-[12.5px] cursor-pointer border-t"
                    style={{
                      color: customColor,
                      background: highlighted === flatFiltered.length ? highlightBg : 'transparent',
                      borderColor: dropdownBorder,
                    }}
                  >
                    Use &ldquo;<strong>{trimmed}</strong>&rdquo; as a custom category
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Limit hint */}
      <div className="flex items-center justify-between mt-1 px-0.5">
        <span className="text-[10.5px]" style={{ color: dark ? '#57534e' : '#a8a29e' }}>
          {atMax ? `Maximum ${MAX_TAGS} categories reached` : `${value.length} of ${MAX_TAGS} categories`}
        </span>
      </div>
    </div>
  )
}
