'use client'

const BOOK_COLORS = [
  '#F97B6B', // B1 coral
  '#F4A261', // B2 peach
  '#8B5CF6', // B3 plum
  '#5BBFB5', // B4 teal
  '#60A5FA', // B5 sky
  '#F472B6', // B6 rose
]

interface Book {
  id: string
  title: string
  asin: string | null
  seriesName: string | null
  tropes: string[]
  customTropes: string[]
  colorCode: string | null
}

interface Props {
  books: Book[]
  launchBookId: string
  launchDate: string
}

export default function BookList({ books, launchBookId, launchDate }: Props) {
  const launchLabel = launchDate
    ? new Date(launchDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null

  return (
    <div style={{
      background: 'var(--paper-2)',
      border: '1px solid var(--rule)',
      borderRadius: 4,
      padding: '24px 32px',
    }}>
      <h3 style={{
        fontFamily: "'Playfair Display', serif",
        fontSize: 18,
        fontWeight: 600,
        color: 'var(--ink)',
        margin: '0 0 4px',
      }}>
        <em style={{ fontStyle: 'italic', fontWeight: 400 }}>Your</em> books
      </h3>
      <p style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        fontSize: 12,
        color: 'var(--ink-4)',
        margin: '0 0 20px',
      }}>
        Pulled from Settings · Buy links assigned to every relevant post
      </p>

      {books.length === 0 ? (
        <div style={{
          padding: '24px',
          textAlign: 'center',
          border: '1px dashed var(--rule)',
          borderRadius: 4,
        }}>
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontStyle: 'italic',
            fontSize: 14,
            color: 'var(--ink-4)',
            margin: '0 0 12px',
          }}>
            No books in your catalog yet.
          </p>
          <a
            href="/dashboard/books"
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--amber)',
              textDecoration: 'none',
            }}
          >
            Add a book →
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {books.map((book, i) => {
            const color = book.colorCode ?? BOOK_COLORS[i % BOOK_COLORS.length]
            const isLaunching = book.id === launchBookId
            const allTropes = [...(book.tropes ?? []), ...(book.customTropes ?? [])]

            return (
              <div
                key={book.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 14,
                  padding: '12px 0',
                  borderBottom: '1px solid var(--rule)',
                }}
              >
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: color,
                  flexShrink: 0,
                  marginTop: 5,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--ink)',
                    }}>
                      {book.title}
                    </span>
                    {isLaunching && launchLabel && (
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 9,
                        fontWeight: 500,
                        color: 'var(--amber)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}>
                        · LAUNCHING {launchLabel}
                      </span>
                    )}
                  </div>
                  {book.seriesName && (
                    <div style={{
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontSize: 11,
                      color: 'var(--ink-3)',
                      marginTop: 2,
                    }}>
                      {book.seriesName}
                    </div>
                  )}
                  {allTropes.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
                      {allTropes.slice(0, 4).map(t => (
                        <span key={t} style={{
                          fontFamily: "'Playfair Display', serif",
                          fontStyle: 'italic',
                          fontSize: 11,
                          color: 'var(--ink-3)',
                          padding: '2px 8px',
                          background: 'rgba(20,33,61,0.06)',
                          borderRadius: 2,
                        }}>
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {book.asin && (
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: 'var(--ink-4)',
                    flexShrink: 0,
                    marginTop: 2,
                  }}>
                    {book.asin}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <a
          href="/dashboard/books"
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--ink-3)',
            textDecoration: 'none',
            border: '1px solid var(--rule)',
            borderRadius: 4,
            padding: '6px 14px',
            display: 'inline-block',
            transition: 'border-color 0.15s',
          }}
        >
          + Add a book
        </a>
      </div>
    </div>
  )
}
