// Fetch by AuthorDash — popup logic.
// Two steps, zero scraping:
//   1. Pair: call AuthorDash /api/extension/pair using the site session cookie
//      (host permission) to get this user's extensionKey.
//   2. Connect: read the two Facebook session cookies and POST them to
//      /api/extension/meta-cookies with that key. Done.

const AUTHORDASH = 'https://authordash.io'

const lead    = document.getElementById('lead')
const actions = document.getElementById('actions')
const statusEl = document.getElementById('status')

let extensionKey = null

function setStatus(msg, kind) {
  statusEl.textContent = msg
  statusEl.className = 'status ' + kind
}
function clearStatus() { statusEl.className = 'status'; statusEl.textContent = '' }

function button(label, cls, onClick) {
  const b = document.createElement('button')
  b.textContent = label
  b.className = cls
  b.onclick = onClick
  return b
}

// ── Step 1: pair with AuthorDash ──────────────────────────────────────────────
async function pair() {
  actions.innerHTML = ''
  clearStatus()
  lead.textContent = 'Connecting Fetch to your AuthorDash account…'
  try {
    const res = await fetch(`${AUTHORDASH}/api/extension/pair`, {
      method: 'POST',
      credentials: 'include',
    })
    if (res.status === 401) {
      lead.textContent = 'First, sign in to AuthorDash in this browser. Then reopen Fetch.'
      actions.appendChild(button('Open AuthorDash', 'primary', () => {
        chrome.tabs.create({ url: `${AUTHORDASH}/dashboard/settings#connections` })
      }))
      return
    }
    if (!res.ok) throw new Error('pair failed')
    const data = await res.json()
    extensionKey = data.extensionKey
    lead.textContent = `Signed in as ${data.account}. Connect your Meta Ads to sync ad performance to AuthorDash.`
    actions.appendChild(button('Connect Meta Ads', 'primary', connectMeta))
  } catch {
    lead.textContent = 'Could not reach AuthorDash. Check your connection and try again.'
    actions.appendChild(button('Retry', 'ghost', pair))
  }
}

// ── Step 2: read Facebook cookies and hand them to AuthorDash ─────────────────
function getCookie(name) {
  return new Promise((resolve) => {
    chrome.cookies.get({ url: 'https://www.facebook.com', name }, (c) => resolve(c ? c.value : null))
  })
}

async function connectMeta() {
  const btn = actions.querySelector('button')
  if (btn) { btn.disabled = true; btn.textContent = 'Connecting…' }
  setStatus('Reading your Facebook session…', 'info')

  const [cUser, xs] = await Promise.all([getCookie('c_user'), getCookie('xs')])
  if (!cUser || !xs) {
    setStatus('You\'re not logged into Facebook in this browser. Log in at facebook.com, then try again.', 'err')
    if (btn) { btn.disabled = false; btn.textContent = 'Connect Meta Ads' }
    actions.appendChild(button('Open Facebook', 'ghost', () => chrome.tabs.create({ url: 'https://www.facebook.com' })))
    return
  }

  setStatus('Linking your Meta Ads to AuthorDash…', 'info')
  try {
    const res = await fetch(`${AUTHORDASH}/api/extension/meta-cookies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${extensionKey}` },
      body: JSON.stringify({ cUser, xs }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.ok) {
      setStatus('✓ Meta Ads connected! Your first sync is running — check AuthorDash in a minute.', 'ok')
      if (btn) btn.remove()
    } else {
      setStatus(data.error || 'Could not connect. Try again in a minute.', 'err')
      if (btn) { btn.disabled = false; btn.textContent = 'Try again' }
    }
  } catch {
    setStatus('Could not reach AuthorDash. Try again in a minute.', 'err')
    if (btn) { btn.disabled = false; btn.textContent = 'Try again' }
  }
}

pair()
