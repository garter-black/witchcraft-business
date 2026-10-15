// GET /closers/api/queue (x-closers-key) -> the full outbound queue plus funnel status. Operator only.
import { J, authed, ensure } from '../_lib.js';
import { PROSPECTS } from '../_data.js';
export async function onRequestGet({ request, env }) {
  if (!(await authed(request))) return J({ ok: false, error: 'unauthorized' }, 401);
  if (!env.DB) return J({ ok: false, error: 'db_unbound' }, 500);
  await ensure(env.DB);
  const ev = await env.DB.prepare('SELECT token, type, COUNT(*) AS n, MAX(created_at) AS last FROM closers_events GROUP BY token, type').all();
  const marks = await env.DB.prepare("SELECT token, type, created_at, detail FROM closers_events WHERE type LIKE 'mark_%' ORDER BY id DESC LIMIT 500").all();
  const bookings = await env.DB.prepare('SELECT * FROM closers_bookings ORDER BY created_at DESC LIMIT 200').all();
  return J({ ok: true, prospects: PROSPECTS, events: ev.results || [], marks: marks.results || [], bookings: bookings.results || [], now: new Date().toISOString() });
}
export const onRequest = () => J({ ok: false, error: 'method_not_allowed' }, 405);
