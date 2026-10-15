// Shared helpers for /closers Pages Functions.
export const KEY_SHA256 = '2e987d4e6611218ae69a5a619ecb53ebee9b27a9d2263149e6225df5a6c6d9c7';
export const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
export const str = (v, n = 200) => (typeof v === 'string' ? v.trim().slice(0, n) : '') || null;
async function sha256hex(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
export async function authed(request) {
  const k = request.headers.get('x-closers-key') || '';
  if (k.length < 16 || k.length > 128) return false;
  const h = await sha256hex(k); let d = 0;
  for (let i = 0; i < 64; i++) d |= h.charCodeAt(i) ^ KEY_SHA256.charCodeAt(i);
  return d === 0;
}
let ready = false;
export async function ensure(DB) {
  if (ready) return;
  await DB.batch([
    DB.prepare("CREATE TABLE IF NOT EXISTS closers_events (id INTEGER PRIMARY KEY AUTOINCREMENT, token TEXT, created_at TEXT DEFAULT (datetime('now')), type TEXT, detail TEXT, ip TEXT, country TEXT)"),
    DB.prepare("CREATE INDEX IF NOT EXISTS closers_events_tok ON closers_events (token, type)"),
    DB.prepare("CREATE TABLE IF NOT EXISTS closers_bookings (id TEXT PRIMARY KEY, token TEXT, created_at TEXT DEFAULT (datetime('now')), want TEXT, name TEXT, role TEXT, email TEXT, phone TEXT, best_time TEXT, notes TEXT, source TEXT, ip TEXT, country TEXT)")
  ]);
  ready = true;
}
export const ip = (request) => request.headers.get('CF-Connecting-IP') || '';
export const country = (request) => (request.cf && request.cf.country) || null;
