// POST /setter/api/lead  -> stores an opted-in pilot lead in D1 (binding DB). No third-party calls.
const CONSENT_V1 = 'I agree that Witchcraft Setter may contact me about a pilot by email, phone call and SMS, including by AI and automated means. Consent is not a condition of purchase. I can opt out any time by replying STOP.';
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const s = (v, n = 200) => (typeof v === 'string' ? v.trim().slice(0, n) : null) || null;
export async function onRequestPost({ request, env }) {
  const t0 = Date.now();
  if (!env.DB) return J({ ok: false, error: 'db_unbound' }, 500);
  const ct = request.headers.get('content-type') || '';
  if (!ct.includes('application/json')) return J({ ok: false, error: 'bad_content_type' }, 415);
  let b; try { b = await request.json(); } catch { return J({ ok: false, error: 'bad_json' }, 400); }
  if (b.hp) return J({ ok: true, id: 'ok' });
  const name = s(b.name, 100), email = s(b.email, 200), phone = s(b.phone, 40);
  if (!name || !email) return J({ ok: false, error: 'missing_fields' }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return J({ ok: false, error: 'bad_email' }, 400);
  if (b.consent !== true) return J({ ok: false, error: 'consent_required' }, 400);
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const recent = await env.DB.prepare("SELECT COUNT(*) AS c FROM leads WHERE ip = ?1 AND created_at > datetime('now','-10 minutes')").bind(ip).first();
  if (recent && recent.c >= 5) return J({ ok: false, error: 'rate_limited' }, 429);
  const id = crypto.randomUUID();
  const consentNote = s(b.consent_text, 600) === CONSENT_V1 ? CONSENT_V1 : CONSENT_V1 + ' [client text differed]';
  const ins = env.DB.prepare(`INSERT INTO leads (id, created_at, name, email, phone, business, monthly_leads, offer_price, message, consent_text, consent_at, ip, country, user_agent,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, gclid, referrer, landing, event_id, status)
      VALUES (?1, datetime('now'), ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, datetime('now'), ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, 'new')`)
    .bind(id, name, email, phone, s(b.business, 200), s(b.monthly_leads, 40), s(b.offer_price, 40), s(b.message, 1000), consentNote, ip,
      (request.cf && request.cf.country) || null, s(request.headers.get('user-agent'), 300),
      s(b.utm_source), s(b.utm_medium), s(b.utm_campaign), s(b.utm_content), s(b.utm_term), s(b.fbclid, 300), s(b.gclid, 300), s(b.referrer, 300), s(b.landing, 300), s(b.event_id, 80))
    ;
  const ev = env.DB.prepare("INSERT INTO events (lead_id, created_at, type, detail) VALUES (?1, datetime('now'), 'lead_created', ?2)").bind(id, 'form');
  await env.DB.batch([ins, ev]);
  return J({ ok: true, id, server_ms: Date.now() - t0 });
}
export const onRequest = () => J({ ok: false, error: 'method_not_allowed' }, 405);
