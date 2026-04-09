import { redirect } from 'next/navigation'

export default function WritingNotebookRedirect({
  searchParams,
}: {
  searchParams: { bookId?: string }
}) {
  const bookId = searchParams.bookId
  if (bookId) {
    redirect(`/dashboard/writing-notebook?bookId=${bookId}`)
  }
  redirect('/dashboard/writing-notebook')
}
