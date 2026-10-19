require('../assets/js/catalog.js'); require('../assets/js/cocurriculars.js'); const E = require('../assets/js/engine.js');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
const s = E.emptyState(); const items = (o) => o.groups.flatMap(g => g.items);
// default = locked
let o = E.optionsFor(s, 9, 'math', 0); ok(!items(o).some(i => i.value === 'apcalcab|AP') && !o.locked.some(i => i.value === 'apcalcab|AP'), 'default: AP Calculus AB is simply not offered in 9th grade');
o = E.optionsFor(s, 10, 'sci', 0); ok(o.locked.some(i => i.value === 'chem|EP') && !items(o).some(i => i.value === 'chem|EP'), 'default: Chemistry is locked (greyed) until Biology is planned');
// show all
o = E.optionsFor(s, 10, 'sci', 0, { showAll: true });
const chem = items(o).find(i => i.value === 'chem|EP'); ok(chem && chem.state === 'blocked' && /⚠/.test(chem.label) && /Biology/.test(chem.label), 'showAll: Chemistry is selectable and marked ⚠ needs Biology: ' + (chem && chem.label));
o = E.optionsFor(s, 9, 'math', 0, { showAll: true }); const ab = items(o).find(i => i.value === 'apcalcab|AP'); ok(ab && /usually taken in grades 10, 11, 12/.test(ab.reason), 'showAll: out-of-grade course shown with a grade warning: ' + (ab && ab.reason));
ok(!items(E.optionsFor(s, 9, 'eng', 1, { showAll: true })).some(i => i.value === 'eng1|EP' && false) && !items(E.optionsFor(s, 9, 'eng', 1, { showAll: true })).some(i => i.value.startsWith('cw1|')), 'showAll still hides fall-only courses from the Spring list (term is not a prerequisite)');
// duplicates never offered
s.plan[9].eng = { f: 'eng1|EP', s: '' }; o = E.optionsFor(s, 9, 'e1', 0, { showAll: true }); ok(!items(o).some(i => i.value === 'eng1|EP') && !o.locked.some(i => i.value === 'eng1|EP'), 'showAll never offers a course already in the plan');
// lenient validation = warnings, not hidden
const t = E.emptyState(); t.plan[9].math = { f: 'apcalcab|AP', s: '' };
let v = E.validateSelections(t); ok(v['9|math|f'].state === 'na', 'strict validation: out-of-grade course has no message');
v = E.validateSelections(t, { lenient: true }); ok(v['9|math|f'].state === 'blocked' && /usually taken in grade/.test(v['9|math|f'].blockedReason), 'lenient validation: heads-up shown: ' + v['9|math|f'].blockedReason);
const P = E.problems(t, { lenient: true }); ok(P.errs.some(e => /AP Calculus AB/.test(e)), 'problems() lists the heads-up');
// strict counselor behavior unchanged
const P0 = E.problems(t); ok(!P0.errs.some(e => /AP Calculus AB/.test(e)), 'counselor-mode behavior unchanged without options');
console.log(fail ? 'FAILURES ' + fail : 'ALL PASS');
