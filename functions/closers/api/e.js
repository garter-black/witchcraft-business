// POST /closers/api/e {t, type, detail} -> funnel event for a prospect link (public, whitelisted, rate-limited).
import { J, str, ensure, ip, country } from '../_lib.js';
import { BY_ID } from '../_data.js';
const TYPES = new Set(['open', 'talk_start', 'talk_live', 'talk_fail', 'demo', 'talk_end', 'face_ok', 'face_fail', 'form_focus']);
export async function onRequestPost({ request, env }) {
  if (!env.DB) return J({ ok: false, error: 'db_unbound' }, 500);
  let b; try { b = await request.json(); } catch { return J({ ok: false, error: 'bad_json' }, 400); }
  const t = typeof b.t === 'string' && BY_ID[b.t] ? b.t : 'none';
  if (!TYPES.has(b.type)) return J({ ok: false, error: 'bad_type' }, 400);
  await ensure(env.DB);
  const who = ip(request);
  const r = await env.DB.prepare("SELECT COUNT(*) AS c FROM closers_events WHERE ip = ?1 AND created_at > datetime('now','-1 minutes')").bind(who).first();
  if (r && r.c >= 40) return J({ ok: false, error: 'rate_limited' }, 429);
  await env.DB.prepare('INSERT INTO closers_events (token, type, detail, ip, country) VALUES (?1, ?2, ?3, ?4, ?5)').bind(t, b.type, str(b.detail, 200), who, country(request)).run();
  return J({ ok: true });
}
export const onRequest = () => J({ ok: false, error: 'method_not_allowed' }, 405);
