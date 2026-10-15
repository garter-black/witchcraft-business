// Cross-implementation parity check: does the deployed JS engine behave the
// same as the tested Python reference?
//
// This matters because the Python package is what all 59 tests cover, while
// the JS file is what actually runs in production. If they disagree, we are
// shipping a different product than the one we tested. Run:
//   node tests/parity.mjs
import { qualify, detectEmergency, matchTrade } from '../functions/trades/_engine.js';

// Fixtures are the same scenarios the Python suite asserts on.
const CASES = [
  { name: 'hvac install', msg: 'I need a new split system installed, 3 bedrooms', trade: 'hvac',
    want: { verdict: 'hot', job: 'hvac_install_split' } },
  { name: 'plumb main sewer', msg: 'sewer is blocked and the whole yard is backing up', trade: 'plumbing',
    answers: [{ question_id: 'plumb_location', value: 'Main drain / outside' }, { question_id: 'plumb_how_many', value: 'Several' }],
    want: { job: 'plumb_clear_main' } },
  { name: 'elec ev', msg: 'can you install a tesla wallbox', trade: 'electrical',
    want: { job: 'elec_ev' } },
  { name: 'clean bond', msg: 'need a bond clean, moving out Friday, 3 bed 2 bath', trade: 'cleaning',
    want: { job: 'clean_bond' } },
  { name: 'gas emergency', msg: 'there is a strong smell of gas from the heater', trade: 'hvac',
    want: { verdict: 'emergency' } },
  { name: 'sewage emergency', msg: 'sewage is backing up inside the house', trade: 'plumbing',
    want: { verdict: 'emergency' } },
  { name: 'sparking emergency', msg: 'my switchboard is sparking and smells of burning', trade: 'electrical',
    want: { verdict: 'emergency' } },
  { name: 'flood emergency', msg: 'water is gushing out all over the floor', trade: 'cleaning',
    want: { verdict: 'emergency' } },
  { name: 'zapped', msg: 'zapped me, my switch is arcing', trade: 'electrical',
    want: { verdict: 'emergency' } },
  { name: 'rotten eggs', msg: 'it smells of rotten eggs near the hot water system', trade: 'plumbing',
    want: { verdict: 'emergency' } },
  { name: 'price shopper', msg: 'just collecting prices, how much for a clean', trade: 'hvac',
    want: { verdict: 'nurture' } },
  { name: 'out of area', msg: 'do you service Newcastle? need an aircon quote', trade: 'hvac',
    want: { verdict: 'disqualified' } },
  { name: 'capability not ooa', msg: 'do you do ev chargers', trade: 'electrical',
    wantNot: { verdict: 'disqualified' } },
  { name: 'unknown message', msg: 'hello there', trade: null,
    want: { verdict: 'unknown' } },
];

let failed = 0;
for (const c of CASES) {
  const q = qualify(c.msg, { tradeHint: c.trade, answers: c.answers || [], currency: 'AUD' });
  const errs = [];
  if (c.want) {
    if (c.want.verdict && q.verdict !== c.want.verdict) errs.push(`verdict ${q.verdict} != ${c.want.verdict}`);
    if (c.want.job && q.jobTypeId !== c.want.job) errs.push(`job ${q.jobTypeId} != ${c.want.job}`);
  }
  if (c.wantNot) {
    for (const [k, v] of Object.entries(c.wantNot)) {
      if (q[k] === v) errs.push(`${k} should not be ${v}`);
    }
  }
  if (errs.length) {
    failed++;
    console.log(`FAIL  ${c.name}: ${errs.join('; ')}`);
  } else {
    console.log(`PASS  ${c.name}  [${q.verdict}/${q.jobTypeId || '-'}]`);
  }
}

// Emergency detection must never depend on the trade matching.
const EMERGENCY_PHRASES = [
  'strong smell of gas', 'water is gushing out', 'zapped me, my switch is arcing',
  'smells of rotten eggs', 'pipes are pouring out water', 'ceiling is collapsing',
  'my outlet is arcing and there is smoke coming from it', 'gas leak near the burner',
  'water everywhere in the kitchen', 'it is sparking and burning',
];
for (const p of EMERGENCY_PHRASES) {
  const q = qualify(p, { tradeHint: null });
  if (q.verdict !== 'emergency') {
    failed++;
    console.log(`FAIL  emergency phrase missed: ${JSON.stringify(p)} -> ${q.verdict}`);
  }
}

console.log(`\n${CASES.length + EMERGENCY_PHRASES.length - failed}/${CASES.length + EMERGENCY_PHRASES.length} parity checks passed`);
process.exit(failed ? 1 : 0);
