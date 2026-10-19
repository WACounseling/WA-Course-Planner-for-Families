require('../assets/js/catalog.js'); const IO = require('../assets/js/planio.js'); const E = (require('../assets/js/cocurriculars.js'), require('../assets/js/engine.js'));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
const b = E.emptyState(); b.plan[9].eng = { f: 'eng1|EP', s: '' }; b.plan[9].e1 = { f: 'ds1|EP', s: 'ds2|EP' }; b.summer[10].su1 = 'trop|EP'; b.prior.psCredit = 1; b.prior.msLang = 'sp:1';
b.prior.transfers = [{ title: 'Bio', equiv: 'bio|EP', area: 'sci', cr: 1, when: '9' }];
const plan = { name: 'Plan A', plan: b.plan, summer: b.summer, prior: b.prior, cocurr: [{ name: 'Debate Team', status: 'active' }, { name: 'Robotics Club', status: 'interest' }], notes: 'hello' };
const one = IO.exportOne(plan, '2030'); ok(one.format === 'wa-path-plan' && one.plan.classOf === '2030' && !/@|email|studentName/i.test(JSON.stringify(one)), 'single-plan file has no personal fields (no name/email)');
const r = IO.parse(JSON.stringify(one)); ok(r.kind === 'one' && r.plan.plan[9].eng.f === 'eng1|EP' && r.plan.plan[9].e1.s === 'ds2|EP' && r.plan.summer[10].su1 === 'trop|EP' && r.plan.prior.msLang === 'sp:1' && r.plan.cocurr.length === 2, 'single plan round-trips');
const all = IO.exportAll({ classOf: '2031', cur: 1, plans: [plan, plan, plan] }); const ra = IO.parse(JSON.stringify(all)); ok(ra.kind === 'all' && ra.plans.length === 3 && ra.cur === 1 && ra.classOf === '2031', 'three-plan file round-trips');
// hostile / broken input is cleaned
const evil = { format: 'wa-path-plan', plan: { name: '<img src=x onerror=alert(1)>'.repeat(10), notes: 'x'.repeat(50000), classOf: '1999', plan: { 9: { eng: { f: 'nope|EP', s: 'cw2|XX' }, math: { f: 'bio|EP', s: '' }, sci: { f: 'ds2|EP', s: '' } }, 99: { eng: { f: 'eng1|EP' } } }, summer: { 9: { su1: 'eng1|EP', su2: 'geo_su|EP' } }, prior: { psCredit: 7, msMath: 'zzz', msLang: 'xx', transfers: new Array(50).fill({ title: 'T'.repeat(500), equiv: 'bogus', area: 'hack', cr: 999, when: 'zz' }) }, cocurr: new Array(100).fill({ name: 'C'.repeat(500), status: 'weird' }) } };
const e = IO.parse(JSON.stringify(evil)).plan;
ok(e.plan[9].eng.f === '' && e.plan[9].eng.s === '' && e.plan[9].sci.f === '' && !e.plan[99], 'unknown courses / wrong terms / unknown grades are dropped');
ok(e.summer[9].su1 === '' && e.summer[9].su2 === 'geo_su|EP', 'only summer courses are allowed in summer slots');
ok(e.name.length <= 40 && e.notes.length <= 2000 && e.classOf === '' && e.prior.psCredit === 0 && e.prior.msMath === 'alg1' && e.prior.msLang === '' && e.prior.transfers.length === 20 && e.prior.transfers[0].area === 'elec' && e.prior.transfers[0].cr === 1 && e.cocurr.length === 40 && e.cocurr[0].name.length === 100 && e.cocurr[0].status === 'active', 'sizes, enums and numbers are clamped');
for (const bad of ['not json', '{"hello":1}', JSON.stringify({ info: {}, plan: {} }), 'x'.repeat(1100000)]) { let er = null; try { IO.parse(bad); } catch (x) { er = x; } ok(er && er.message.length > 10, 'rejects bad file: ' + String(bad).slice(0, 14) + ' -> ' + (er && er.message.slice(0, 50))); }
console.log(fail ? 'FAILURES ' + fail : 'ALL PASS');
