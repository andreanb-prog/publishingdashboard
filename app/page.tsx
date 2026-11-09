// app/page.tsx
import { site, sessions, systems, steps, faqs } from '@/lib/site'

const bookHref = site.bookingUrl || '#sessions'
const bookTarget = site.bookingUrl ? { target: '_blank', rel: 'noopener noreferrer' } : {}

function BookButton({
  label = 'Book a free discovery call',
  ghost = false,
  href,
}: {
  label?: string
  ghost?: boolean
  href?: string
}) {
  const external = href ? { target: '_blank', rel: 'noopener noreferrer' } : bookTarget
  return (
    <a href={href || bookHref} {...external} className={`btn ${ghost ? 'btn-ghost' : 'btn-primary'}`}>
      {label}
      <span aria-hidden="true">&rarr;</span>
    </a>
  )
}

function SectionHead({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 font-[family-name:var(--font-fraunces)] text-3xl leading-tight text-[var(--ink)] sm:text-4xl">
        {title}
      </h2>
      {intro && <p className="mt-4 text-lg leading-relaxed text-[var(--ink3)]">{intro}</p>}
    </div>
  )
}

const wrap = 'mx-auto w-full max-w-6xl px-4 sm:px-8'

export default function Home() {
  return (
    <>
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--paper)]/90 backdrop-blur">
        <nav className={`${wrap} flex h-16 items-center justify-between`}>
          <a href="#" className="font-[family-name:var(--font-fraunces)] text-xl font-semibold tracking-tight">
            {site.brand}
          </a>
          <div className="flex items-center gap-6 text-sm">
            <a href="#systems" className="hidden text-[var(--ink3)] hover:text-[var(--ink)] sm:inline">
              What I build
            </a>
            <a href="#sessions" className="hidden text-[var(--ink3)] hover:text-[var(--ink)] sm:inline">
              Sessions
            </a>
            <a href="#faq" className="hidden text-[var(--ink3)] hover:text-[var(--ink)] md:inline">
              FAQ
            </a>
            <a href={bookHref} {...bookTarget} className="btn btn-primary !px-4 !py-2 text-sm">
              Book a call
            </a>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className={`${wrap} grid gap-12 pb-20 pt-16 sm:pt-24 lg:grid-cols-[1.15fr_1fr] lg:items-center`}>
          <div>
            <p className="eyebrow">{site.tagline}</p>
            <h1 className="mt-4 font-[family-name:var(--font-fraunces)] text-[2.6rem] leading-[1.05] tracking-tight text-[var(--ink)] sm:text-6xl">
              Let AI run the busywork. <em className="text-[var(--amber-text)]">You</em> get back to the books.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--ink3)]">
              I help indie authors set up Claude, ChatGPT and the tools they already use as systems that work for
              them and with them: launch plans, ad reviews, newsletter swaps, weekly numbers. Built one-on-one, in
              your voice, in your accounts.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <BookButton />
              <a href="#systems" className="btn btn-ghost">
                See what we could build
              </a>
            </div>
          </div>

          {/* Example output card */}
          <figure className="rounded-[2px] border border-[var(--line)] bg-[var(--card)] p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Monday summary</span>
              <span className="font-mono text-xs text-[var(--ink4)]">example output</span>
            </div>
            <div className="rule my-5" />
            <p className="font-[family-name:var(--font-fraunces)] text-lg italic leading-relaxed text-[var(--ink2)]">
              &ldquo;Book 2 page reads are up 18% since the newsletter swap on Thursday. Ads on Book 1 spent more than
              they earned for the third week, so pause the broad audience and keep the trope ad running.&rdquo;
            </p>
            <ul className="mt-6 space-y-3 text-sm text-[var(--ink3)]">
              {['Pause one ad set (2 min)', 'Confirm Saturday swap with partner', 'Draft Friday newsletter from chapter 4'].map(
                (t) => (
                  <li key={t} className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--amber)]" aria-hidden="true" />
                    {t}
                  </li>
                ),
              )}
            </ul>
            <figcaption className="mt-6 border-t border-[var(--line)] pt-4 text-xs text-[var(--ink4)]">
              The kind of thing your system hands you each week, without you opening a spreadsheet.
            </figcaption>
          </figure>
        </section>

        {/* Problem */}
        <section className="border-y border-[var(--line)] bg-[var(--paper2)]">
          <div className={`${wrap} grid gap-10 py-16 md:grid-cols-[1fr_1.4fr] md:py-20`}>
            <SectionHead eyebrow="Sound familiar?" title="You signed up for the AI tool. Now it just sits there." />
            <ul className="grid gap-px overflow-hidden rounded-[2px] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
              {[
                'Every chat starts from scratch, so you re-explain your series each time.',
                'The output sounds generic, nothing like your voice or your readers.',
                'Marketing tasks pile up between drafts and eat your writing days.',
                'You know AI could help. You just do not have hours to figure out how.',
              ].map((t) => (
                <li key={t} className="bg-[var(--card)] p-6 text-[var(--ink2)] leading-relaxed">
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Systems */}
        <section id="systems" className={`${wrap} scroll-mt-20 py-20 sm:py-24`}>
          <SectionHead
            eyebrow="What we can build"
            title="Systems shaped around how you actually publish"
            intro="Not prompts you copy and forget. Each system remembers your books, your readers and your voice, and is set up to run again next week."
          />
          <div className="mt-12 grid gap-px overflow-hidden rounded-[2px] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-3">
            {systems.map((s, i) => (
              <article key={s.title} className="bg-[var(--card)] p-7">
                <span className="font-mono text-xs text-[var(--ink4)]">{String(i + 1).padStart(2, '0')}</span>
                <h3 className="mt-3 font-[family-name:var(--font-fraunces)] text-xl text-[var(--ink)]">{s.title}</h3>
                <p className="mt-3 leading-relaxed text-[var(--ink3)]">{s.body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="bg-[var(--navy)] text-[var(--paper)]">
          <div className={`${wrap} py-20 sm:py-24`}>
            <p className="eyebrow !text-[var(--amber-soft)]">How it works</p>
            <h2 className="mt-3 max-w-2xl font-[family-name:var(--font-fraunces)] text-3xl leading-tight sm:text-4xl">
              We build it together, and you keep it
            </h2>
            <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((s, i) => (
                <li key={s.title} className="border-t border-white/20 pt-5">
                  <span className="font-[family-name:var(--font-fraunces)] text-3xl italic text-[var(--amber-soft)]">
                    {i + 1}
                  </span>
                  <h3 className="mt-2 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-white/70">{s.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Sessions */}
        <section id="sessions" className={`${wrap} scroll-mt-20 py-20 sm:py-24`}>
          <SectionHead
            eyebrow="Work with me"
            title="Pick the session that fits"
            intro="Every engagement starts with a free call so we can make sure it is worth your time and money."
          />
          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {sessions.map((s) => (
              <article
                key={s.name}
                className={`flex flex-col rounded-[2px] border bg-[var(--card)] p-7 ${
                  s.featured ? 'border-[var(--amber)] ring-1 ring-[var(--amber)]' : 'border-[var(--line)]'
                }`}
              >
                {s.featured && <p className="eyebrow mb-3">Most popular</p>}
                <h3 className="font-[family-name:var(--font-fraunces)] text-2xl text-[var(--ink)]">{s.name}</h3>
                <p className="mt-1 text-sm text-[var(--ink4)]">{s.length}</p>
                <p className="mt-5 font-[family-name:var(--font-fraunces)] text-3xl text-[var(--ink)]">
                  {s.price ?? <span className="text-lg italic text-[var(--ink3)]">Pricing on the call</span>}
                </p>
                {s.priceNote && <p className="mt-1 text-sm text-[var(--ink4)]">{s.priceNote}</p>}
                <p className="mt-5 leading-relaxed text-[var(--ink3)]">{s.summary}</p>
                <ul className="mt-6 flex-1 space-y-3 border-t border-[var(--line)] pt-6 text-sm text-[var(--ink2)]">
                  {s.includes.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--amber)]" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <BookButton
                    href={s.bookingUrl}
                    label={s.bookingUrl ? 'Book this session' : s.price === 'Free' ? 'Book the free call' : 'Start with a free call'}
                    ghost={!s.featured}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* About */}
        <section className="border-y border-[var(--line)] bg-[var(--paper2)]">
          <div className={`${wrap} grid gap-10 py-20 md:grid-cols-[1fr_1.5fr] md:items-start`}>
            <div>
              <p className="eyebrow">Who you&rsquo;ll work with</p>
              <div className="mt-4 flex items-center gap-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/andrea.webp"
                  alt={`${site.consultant}, AI systems consultant for indie authors`}
                  width={1254}
                  height={1254}
                  loading="lazy"
                  className="h-20 w-20 shrink-0 rounded-full object-cover object-[50%_30%] ring-1 ring-[var(--amber)] ring-offset-4 ring-offset-[var(--paper2)] sm:h-24 sm:w-24"
                />
                <h2 className="font-[family-name:var(--font-fraunces)] text-3xl leading-tight text-[var(--ink)] sm:text-4xl">
                  Hi, I&rsquo;m {site.consultant}.
                </h2>
              </div>
            </div>
            <div className="space-y-5 text-lg leading-relaxed text-[var(--ink2)]">
              <p>
                I&rsquo;m an indie author too, but I bring more than 20 years of marketing and teaching expertise to
                your new venture. I&rsquo;ve served as Communications Director in the California State Senate and led
                audience development and acquisition for a major Hollywood studio. I also hold a master&rsquo;s degree
                in leadership.
              </p>
              <p>
                When marketing started eating my own writing days, I built AI systems to handle it, and that work
                became {site.brand}.
              </p>
              <p>
                Now I pair that marketing experience with something just as important: teaching you to master these
                tools yourself. You won&rsquo;t just leave with a system. You&rsquo;ll understand it
                well enough to change it, fix it and build the next one on your own.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className={`${wrap} scroll-mt-20 py-20 sm:py-24`}>
          <SectionHead eyebrow="Questions" title="Before you book" />
          <div className="mt-10 max-w-3xl divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex items-center justify-between gap-6 text-lg font-semibold text-[var(--ink)]">
                  {f.q}
                  <span className="faq-plus text-2xl font-light text-[var(--amber-text)] transition-transform" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed text-[var(--ink3)]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className={`${wrap} pb-24`}>
          <div className="rounded-[2px] border border-[var(--line)] bg-[var(--card)] px-6 py-14 text-center sm:px-12">
            <h2 className="mx-auto max-w-2xl font-[family-name:var(--font-fraunces)] text-3xl leading-tight sm:text-4xl">
              Bring the task you dread most. We&rsquo;ll start there.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-[var(--ink3)]">
              Twenty minutes, free, no pitch deck. Just a clear next step.
            </p>
            <div className="mt-8 flex justify-center">
              <BookButton />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--line)]">
        <div className={`${wrap} flex flex-col gap-3 py-8 text-sm text-[var(--ink4)] sm:flex-row sm:items-center sm:justify-between`}>
          <p>
            &copy; {new Date().getFullYear()} {site.brand}
          </p>
          {site.contactEmail && (
            <a href={`mailto:${site.contactEmail}`} className="hover:text-[var(--ink)]">
              {site.contactEmail}
            </a>
          )}
        </div>
      </footer>
    </>
  )
}
