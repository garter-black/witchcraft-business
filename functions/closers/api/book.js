// POST /closers/api/book -> a prospect asked for the free week / a walkthrough / a question, or opted out.
// Sources: Artemis's request_meeting tool (source=agent) or the page form (source=form). Stored in D1; optional email ping via Resend.
import { J, str, ensure, ip, country } from '../_lib.js';
import { BY_ID } from '../_data.js';
const WANTS = new Set(['free_week', 'walkthrough', 'question', 'opt_out']);
export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.DB) return J({ ok: false, error: 'db_unbound' }, 500);
  if (!(request.headers.get('content-type') || '').includes('application/json')) return J({ ok: false, error: 'bad_content_type' }, 415);
  let b; try { b = await request.json(); } catch { return J({ ok: false, error: 'bad_json' }, 400); }
  if (b.hp) return J({ ok: true, id: 'ok' });
  const want = WANTS.has(b.want) ? b.want : null;
  if (!want) return J({ ok: false, error: 'bad_want' }, 400);
  const email = str(b.email, 200);
  if (want !== 'opt_out' && (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))) return J({ ok: false, error: 'bad_email' }, 400);
  const source = b.source === 'form' ? 'form' : 'agent';
  if (source === 'form' && want !== 'opt_out' && b.consent !== true) return J({ ok: false, error: 'consent_required' }, 400);
  await ensure(env.DB);
  const who = ip(request);
  const r = await env.DB.prepare("SELECT COUNT(*) AS c FROM closers_bookings WHERE ip = ?1 AND created_at > datetime('now','-10 minutes')").bind(who).first();
  if (r && r.c >= 6) return J({ ok: false, error: 'rate_limited' }, 429);
  const t = typeof b.t === 'string' && BY_ID[b.t] ? b.t : 'none';
  const id = crypto.randomUUID();
  const row = [id, t, want, str(b.name, 120), str(b.role, 80), email, str(b.phone, 40), str(b.best_time, 120), str(b.notes, 1200), source, who, country(request)];
  await env.DB.batch([
    env.DB.prepare('INSERT INTO closers_bookings (id, token, want, name, role, email, phone, best_time, notes, source, ip, country) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)').bind(...row),
    env.DB.prepare('INSERT INTO closers_events (token, type, detail, ip, country) VALUES (?1, ?2, ?3, ?4, ?5)').bind(t, 'booked_' + want, source, who, country(request))
  ]);
  if (env.RESEND_API_KEY && env.NOTIFY_TO && env.NOTIFY_FROM) {
    const p = BY_ID[t];
    const text = ['Witchcraft Closers: ' + want.replace('_', ' ') + ' via ' + source, 'Firm: ' + (p ? p.firm + ' (' + p.city + ')' : 'no token'), 'Name: ' + (row[3] || '-') + ' / ' + (row[4] || '-'), 'Email: ' + (email || '-'), 'Phone: ' + (row[6] || '-'), 'Best time: ' + (row[7] || '-'), 'Notes: ' + (row[8] || '-'), 'Console: https://witchcraft.business/closers/console/'].join('\n');
    waitUntil(fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: env.NOTIFY_FROM, to: env.NOTIFY_TO.split(','), subject: 'Closers: ' + want.replace('_', ' ') + ' - ' + (p ? p.firm : 'website'), text }) }).catch(() => {}));
  }
  return J({ ok: true, id });
}
export const onRequest = () => J({ ok: false, error: 'method_not_allowed' }, 405);
