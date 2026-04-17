// app/dashboard/creative/page.tsx
import { redirect } from 'next/navigation'

export const metadata = { title: 'Creative Hub — AuthorDash' }

export default async function CreativePage() {
  redirect('/dashboard')
}
