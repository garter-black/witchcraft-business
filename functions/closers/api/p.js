// GET /closers/api/p?t=TOKEN -> the minimum a prospect page needs to greet them. No emails or phones.
import { J } from '../_lib.js';
import { BY_ID } from '../_data.js';
export async function onRequestGet({ request }) {
  const t = new URL(request.url).searchParams.get('t') || '';
  const p = /^[a-z0-9]{5,12}$/.test(t) ? BY_ID[t] : null;
  if (!p) return J({ ok: false, error: 'unknown' }, 404);
  return J({ ok: true, firm: p.firm, first: p.first, city: p.city, segment: p.seg === 'pi' ? 'law' : 'dental', hook: p.hook });
}
export const onRequest = () => J({ ok: false, error: 'method_not_allowed' }, 405);
