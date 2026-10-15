# witchcraft-business — provenance

Cloudflare Pages project `witchcraft-business`, account `86cf181f919e67fc61e33a0d578903b0`.
Public host `witchcraft.business` (CNAME → `witchcraft-business.pages.dev`).
Established by the estate source-of-truth lane on **2026-10-16**. Nothing was deployed.

## Project-to-directory mapping — confirmed, not guessed

`WEBSITES/witchcraft-business-project/wrangler.toml` is the project's own config:

```toml
name = "witchcraft-business"
pages_build_output_dir = "../witchcraft-business-deploy-20260926"
```

So `WEBSITES/witchcraft-business-deploy-20260926/` is not a stale snapshot — it is the
**declared Pages output directory**, and `wrangler.toml` is committed here as the proof.
Corroborated independently by `WEBSITES/.wrangler/cache/pages.json` →
`"project_name": "witchcraft-business"`.

## What lives here

```
wrangler.toml                              Pages project config (the build declaration)
pages/                                     the deployed static site (index, setter/, closers/)
functions/                                 Pages Functions (setter/api, closers/api, _lib.js)
tests/parity.mjs                           the deployed-vs-Functions parity check
```

## Deliberately NOT committed

| Path | Why |
|---|---|
| `functions/closers/_data.js` | 67,694 B of **third-party personal data** — real prospect names, emails, phones and pre-written cold-email bodies harvested from US law firms' own websites (built 29 Sep 2026). Plan §1: roster/customer data never enters git. Also gitignored by path. |
| `workers/umbra-spatius/` | A **separate Workers service**, not this Pages project (own `wrangler.toml`, `workers_dev = true`). It also lists `theblackgarter.com.au` in its CORS origin allowlist, which the sweep's hard rule forbids committing. Source remains at `WEBSITES/witchcraft-business-project/umbra-spatius/`. |
| `pages/assets/` (19 PNG/JPG), `pages/setter/voice/` (21 PCM), `pages/setter/avatar/` | Media and pre-rendered audio — 53 files, 12,773,506 B. Live and verified; they live in R2/object storage per plan §1. |

## Secrets

The deploy tree is clean by design and says so in its own first comment:
`setter/app.js` line 1 — *"No secrets live here: the Spatius key stays in the umbra-spatius
Worker and the ElevenLabs key never leaves the operator's machine."*
Verified: no `sk-`/`ghp_`/PEM/key-assignment pattern in any committed blob.
One 64-hex constant in `functions/closers/_lib.js` is a **sha256 of a shared
prospect token used as a lookup salt**, not a credential (verified by reading its
use site); recorded here rather than left for a reader to rediscover.

## Not verified

- Nothing deployed. `witchcraft.business/` serves **more** than this repo: `pbi-edge`
  injects a Witchcraft-showcase index section and the BKW identity footer at the edge.
  That injected section has **no local source anywhere on this disk** — it is a genuine
  gap, recorded in the decision file.
- The edge-injected homepage is why custom-domain bytes (55,375 B) differ from the
  Pages-origin bytes (34,469 B). The committed file matches the **Pages origin** exactly.
- `/closers/api/*` Functions: `GET /closers/api/e` → 405 (correct: POST-only),
  `GET /closers/api/p?t=…` → 404 for an unknown token. Read-only GETs only; no lead,
  booking or event was written during this sweep.
- `tests/parity.mjs` was **not executed** — it requires a live D1 binding.
