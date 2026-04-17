import { redirect } from 'next/navigation'

// ROAS Hub is hidden from nav — redirect to dashboard
export default function RoasHubRedirect() {
  redirect('/dashboard')
}
