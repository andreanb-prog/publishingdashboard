// lib/swaps.ts
// Adapter between the SwapEntry model (the single source of truth for swaps —
// synced from BookClicker and written by manual Add Swap) and the shape the Swaps
// UI consumes. Keeping this in one place lets the server page and all swap API
// routes serialize identically.
import type { SwapEntry } from '@prisma/client'

export interface SerializedSwap {
  id: string
  partnerName: string
  partnerEmail: string | null
  partnerListSize: number | null
  bookTitle: string
  promoFormat: string | null
  promoDate: string
  direction: string        // 'you_promote' | 'they_promote'
  status: string           // component vocab: 'booked' | 'confirmed' | 'complete' | 'cancelled'
  source: string | null    // platform: 'bookclicker' | 'direct' | ...
  launchWindow: string | null
  createdAt: string
  updatedAt: string
  // Raw SwapEntry fields carried through for precise UI decisions:
  confirmation: string     // 'applied' | 'approved' | 'complete' | 'cancelled'
  role: string | null      // 'inbound' | 'outbound' | 'outbound-send' | null
  paymentType: string      // 'swap' | 'paid'
  myList: string           // which of MY lists this row belongs to (pen name)
  sourceListId: string | null // platform-side list id (BookClicker calendar id)
  notes: string | null
}

// role → the UI's direction vocab. inbound = they promote my book; outbound /
// outbound-send = I promote their book. A null role (paid promos) is treated
// as incoming.
export function roleToDirection(role: string | null): string {
  return role?.startsWith('outbound') ? 'you_promote' : 'they_promote'
}

// SwapEntry confirmation → component status vocab.
export function confirmationToStatus(c: string): string {
  switch (c) {
    case 'approved':  return 'confirmed'
    case 'complete':  return 'complete'
    case 'cancelled': return 'cancelled'
    case 'applied':
    default:          return 'booked'
  }
}
// Component status (what the UI's buttons send) → SwapEntry confirmation, for writes.
export function statusToConfirmation(s: string): string {
  switch (s) {
    case 'sent':
    case 'complete':  return 'complete'
    case 'cancelled': return 'cancelled'
    case 'confirmed':
    case 'approved':  return 'approved'
    case 'booked':
    case 'applied':
    default:          return 'applied'
  }
}

function cap(s: string | null): string | null {
  if (!s) return null
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function serializeSwapEntry(e: SwapEntry): SerializedSwap {
  return {
    id: e.id,
    partnerName: e.partnerName ?? '',
    partnerEmail: null, // SwapEntry has no email column
    partnerListSize: e.partnerListSize ?? null,
    bookTitle: e.myBook ?? e.theirBook ?? '',
    promoFormat: cap(e.swapType),
    promoDate: (e.promoDate ?? e.createdAt).toISOString(),
    direction: roleToDirection(e.role),
    status: confirmationToStatus(e.confirmation),
    source: e.platform ?? null,
    launchWindow: e.partnerListName ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    confirmation: e.confirmation,
    role: e.role,
    paymentType: e.paymentType,
    myList: e.myList,
    sourceListId: e.sourceListId ?? null,
    notes: e.notes ?? null,
  }
}
