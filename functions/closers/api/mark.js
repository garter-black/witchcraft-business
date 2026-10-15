// POST /closers/api/mark (x-closers-key) {t, status, channel} -> operator marks a prospect sent / skipped / replied / reset.
import { J, str, authed, ensure, ip, country } from '../_lib.js';
import { BY_ID } from '../_data.js';
const ST = new Set(['sent', 'skipped', 'replied', 'reset']);
export async function onRequestPost({ request, env }) {
  if (!(await authed(request))) return J({ ok: false, error: 'unauthorized' }, 401);
  if (!env.DB) return J({ ok: false, error: 'db_unbound' }, 500);
  let b; try { b = await request.json(); } catch { return J({ ok: false, error: 'bad_json' }, 400); }
  if (!BY_ID[b.t] || !ST.has(b.status)) return J({ ok: false, error: 'bad_mark' }, 400);
  await ensure(env.DB);
  await env.DB.prepare('INSERT INTO closers_events (token, type, detail, ip, country) VALUES (?1, ?2, ?3, ?4, ?5)').bind(b.t, 'mark_' + b.status, str(b.channel, 40), ip(request), country(request)).run();
  return J({ ok: true });
}
export const onRequest = () => J({ ok: false, error: 'method_not_allowed' }, 405);
