// app/dashboard/upload/page.tsx — redirects to dashboard and opens upload modal
import { redirect } from 'next/navigation'

export default function UploadPage() {
  redirect('/dashboard?upload=1')
}
