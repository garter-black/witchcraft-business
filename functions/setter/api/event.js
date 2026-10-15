// POST /setter/api/event -> appends a funnel event (first_touch, demo_booked, ...) to an existing lead. Whitelisted types only.
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const TYPES = new Set(['first_touch', 'demo_booked', 'demo_transfer', 'demo_optout', 'call_answered']);
export async function onRequestPost({ request, env }) {
  if (!env.DB) return J({ ok: false, error: 'db_unbound' }, 500);
  let b; try { b = await request.json(); } catch { return J({ ok: false, error: 'bad_json' }, 400); }
  const id = typeof b.id === 'string' ? b.id.slice(0, 64) : '';
  if (!/^[0-9a-f-]{36}$/.test(id) || !TYPES.has(b.type)) return J({ ok: false, error: 'bad_event' }, 400);
  const lead = await env.DB.prepare('SELECT id FROM leads WHERE id = ?1').bind(id).first();
  if (!lead) return J({ ok: false, error: 'unknown_lead' }, 404);
  const detail = b.detail == null ? null : String(b.detail).slice(0, 200);
  await env.DB.prepare("INSERT INTO events (lead_id, created_at, type, detail) VALUES (?1, datetime('now'), ?2, ?3)").bind(id, b.type, detail).run();
  if (b.type === 'first_touch' && /^\d+$/.test(detail || '')) await env.DB.prepare('UPDATE leads SET first_touch_ms = ?1 WHERE id = ?2').bind(parseInt(detail, 10), id).run();
  return J({ ok: true });
}
export const onRequest = () => J({ ok: false, error: 'method_not_allowed' }, 405);
