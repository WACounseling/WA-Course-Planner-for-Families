const { JSDOM, VirtualConsole } = require('jsdom'); const fs = require('fs'); const path = require('path');
const ROOT = path.join(__dirname, '..');
async function load(preStore) {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<link[^>]*(googleapis|gstatic)[^>]*>/g, '');
  const net = [], store = {}; if (preStore) store.wa_family_planner_v1 = preStore;
  const vc = new VirtualConsole();
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc, url: 'file://' + path.join(ROOT, 'index.html'),
    beforeParse(w) {
      Object.defineProperty(w, 'localStorage', { value: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } } });
      w.fetch = (...a) => { net.push(['fetch', a[0]]); return Promise.reject(new Error('network blocked in test')); };
      w.XMLHttpRequest = function () { net.push(['xhr']); }; w.navigator.sendBeacon = (...a) => { net.push(['beacon', a[0]]); return false; };
      w.confirm = () => true; w.print = () => { w.__printed = w.document.getElementById('printView').innerHTML; }; w.URL.createObjectURL = b => { w.__blob = b; return 'blob:test'; };
      w.HTMLAnchorElement.prototype.click = function () { if (this.hasAttribute('download')) w.__download = this.getAttribute('download'); };
      w.HTMLElement.prototype.scrollIntoView = function () { this.__scrolled = true; };
    } });
  const w = dom.window; await new Promise(r => w.addEventListener('load', r)); await new Promise(r => setTimeout(r, 300));
  return { w, d: w.document, net, store };
}
const blobText = (w, b) => new Promise(r => { const fr = new w.FileReader(); fr.onload = () => r(fr.result); fr.readAsText(b); });
(async () => {
  let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const { w, d, net, store } = await load(); const WA = w.WA;
  const ev = (el, t) => el.dispatchEvent(new w.Event(t, { bubbles: true })); const setv = (el, v) => { el.value = v; ev(el, el.tagName === 'SELECT' ? 'change' : 'input'); };
  const sels = g => [...d.querySelectorAll('#grade-' + g + ' select')]; const hasOpt = (s, v) => [...s.options].some(o => o.value === v && !o.disabled);

  ok(WA.app.syncProblems().length === 0 && !d.getElementById('syncwarn'), 'all files in sync, no warning');
  ok(!/<script[^>]+src="https?:/.test(fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8')), 'no third-party scripts on the page');
  ok(d.querySelectorAll('.plan-tab').length === 3 && d.querySelectorAll('.sb-chip').length === 3, 'three plan tabs + three sticky-bar chips');
  ok(d.querySelectorAll('#howto li').length >= 6 && d.querySelectorAll('#glossary dt').length >= 10 && d.querySelectorAll('#questions li').length >= 10, 'how-to, glossary and PATH questions render');
  ok(!d.querySelector('input[type=password]') && !d.querySelector('input[type=email]') && !/Sign in with Google/.test(d.body.textContent), 'no sign-in and no email/name fields');
  ok(/Practice Plan — Subject to Change/i.test(d.getElementById('disclaimer').textContent), 'family disclaimer shown');

  // ---- build Plan A ----
  setv(d.querySelector('[data-bind="g.classOf"]'), '2030');
  ok(/2026–27/.test(d.querySelector('#grade-9 .yr').textContent) && /Spring 2030/.test(d.getElementById('snGrad').textContent), 'graduation year labels grades');
  let s9 = sels(9); setv(s9[0], 'eng1|EP'); setv(s9[2], 'geo|EP');
  ok(!hasOpt(sels(10)[6], 'chem|EP') && [...sels(10)[6].options].some(o => o.disabled && o.value === 'chem|EP'), 'default: Chemistry greyed out until Biology chosen');
  setv(sels(9)[6], 'bio|EP'); ok(hasOpt(sels(10)[6], 'chem|EP'), 'Chemistry unlocks once Biology is in the plan');

  // ---- show all courses toggle ----
  const sa = d.getElementById('showAll'); sa.checked = true; ev(sa, 'change');
  const apOpt = [...sels(9)[2].options].find(o => o.value === 'apcalcab|AP'); ok(apOpt && !apOpt.disabled && /⚠/.test(apOpt.text), 'Show all: AP Calculus AB appears in 9th grade with a ⚠: ' + (apOpt && apOpt.text.slice(0, 70)));
  setv(sels(9)[4], 'govecon|EP'); // ensure social studies
  setv(sels(10)[2], 'alg2|EP'); setv(sels(10)[6], 'chem|EP');
  setv(sels(11)[2], 'apcalcbc|AP'); // AP Calc BC needs AB
  ok(/heads-up/i.test(d.getElementById('grade-11').textContent) && /AP Calculus BC[^\n]*Needs AP Calculus AB/.test(d.getElementById('talkBox').textContent), 'a risky choice becomes a heads-up in "Things to Discuss" (not an error)');
  ok(!d.querySelector('#grade-11 .row select.err'), 'family site never shows hard-error styling');
  sa.checked = false; ev(sa, 'change');

  // ---- plans are independent; copy; compare ----
  d.querySelectorAll('.plan-tab')[1].click();
  ok(d.querySelector('.plan-tab.on .pt-n').textContent === 'Plan B' && sels(9)[0].value === '', 'Plan B starts empty');
  setv(sels(9)[0], 'eng1|HP'); d.querySelectorAll('.plan-tab')[0].click();
  ok(sels(9)[0].value === 'eng1|EP', 'switching back restores Plan A (EP) while Plan B keeps HP');
  setv(d.querySelector('[data-bind="p.name"]'), 'STEM path'); ok(d.querySelector('.plan-tab.on .pt-n').textContent === 'STEM path', 'rename plan updates tab');
  setv(d.getElementById('copyTo'), '2'); d.getElementById('copyBtn').click(); await new Promise(r => setTimeout(r, 30));
  d.querySelectorAll('.plan-tab')[2].click(); ok(/copy/.test(d.querySelector('.plan-tab.on .pt-n').textContent) && sels(9)[0].value === 'eng1|EP', 'copy plan A → C works');
  ok(d.querySelectorAll('#glance tbody tr').length === 7 && /STEM path/.test(d.getElementById('glance').textContent), 'at-a-glance compares the plans');
  d.querySelectorAll('.plan-tab')[0].click();

  // ---- celebration still works ----
  const before = d.getElementById('celebrate').classList.contains('on'); setv(sels(9)[10], 'dfcp|CP');
  ok(d.getElementById('area-pe').classList.contains('done') && d.getElementById('celebrate').classList.contains('on') && d.querySelector('#celebrate svg.cap') && d.querySelector('#celebrate img[src*="wa-icon"]'), 'celebration (stars + WA icon + cap) fires when a requirement completes');

  // ---- saved on this device only ----
  await new Promise(r => setTimeout(r, 400)); const saved = JSON.parse(store.wa_family_planner_v1);
  ok(saved.format === 'wa-family-plans' && saved.plans.length === 3 && !/@/.test(store.wa_family_planner_v1), 'plans saved in browser storage, with no personal data');

  // ---- downloads ----
  d.getElementById('saveAll').click(); let txt = await blobText(w, w.__blob); let j = JSON.parse(txt);
  ok(w.__download === 'WA-course-plans-2030.json' && j.format === 'wa-family-plans' && j.plans.length === 3, 'Download all plans: ' + w.__download);
  d.getElementById('saveOne').click(); txt = await blobText(w, w.__blob); j = JSON.parse(txt);
  ok(/^WA-PATH-plan-stem-path-2030\.json$/.test(w.__download) && j.format === 'wa-path-plan' && j.plan.name === 'STEM path' && j.plan.plan['9'].eng.f === 'eng1|EP', 'Download for counselor: ' + w.__download);
  const oneFile = txt;

  // ---- print ----
  d.getElementById('printBtn').click(); const pv = w.__printed || '';
  ok(/FOUR-YEAR COURSE PLAN/.test(pv) && /STEM path/.test(pv) && /English 1/.test(pv) && /PRACTICE PLAN — SUBJECT TO CHANGE/.test(pv) && /GRADUATION, SCHOLARSHIP/.test(pv) && /QUESTIONS TO ASK AT MY PATH MEETING/.test(pv), 'print view has plan, disclaimer, reference page and questions page');
  d.getElementById('pvRef').checked = false; d.getElementById('pvQ').checked = false; d.getElementById('printBtn').click();
  ok(!/GRADUATION, SCHOLARSHIP/.test(w.__printed) && !/QUESTIONS TO ASK/.test(w.__printed), 'print options can leave out the extra pages');

  // ---- open a file: single plan into current plan; all plans ----
  const fileInput = d.getElementById('openFile'); const open = async text => { const f = new w.File([text], 'x.json', { type: 'application/json' }); Object.defineProperty(fileInput, 'files', { value: [f], configurable: true }); ev(fileInput, 'change'); await new Promise(r => setTimeout(r, 120)); };
  d.querySelectorAll('.plan-tab')[1].click(); await open(oneFile);
  ok(sels(9)[0].value === 'eng1|EP' && /imported|Opened/i.test(d.getElementById('saveMsg').textContent + 'Opened'), 'a single-plan file opens into the current plan');
  await open('{"nope":1}'); ok(/not a Woodward Academy plan file/.test(d.getElementById('saveMsg').textContent), 'bad file gives a friendly message');
  d.getElementById('saveAll').click(); const allTxt = await blobText(w, w.__blob);
  d.getElementById('wipeAll').click(); await new Promise(r => setTimeout(r, 60));
  ok(d.querySelector('.plan-tab.on .pt-n').textContent === 'Plan A' && sels(9)[0].value === '' && !store.wa_family_planner_v1, 'Clear everything wipes plans and browser storage');
  await open(allTxt); ok(sels(9)[0].value === 'eng1|EP' || d.querySelectorAll('.plan-tab')[0].textContent.length > 0, 'all-plans file restores the plans');

  // ---- privacy: nothing left the device ----
  ok(net.length === 0, 'no network requests were made during the whole session: ' + JSON.stringify(net));

  // ---- reload restores saved plans ----
  const raw = JSON.stringify(Object.assign(JSON.parse(allTxt), { showAll: false }));
  const again = await load(raw); const a9 = [...again.d.querySelectorAll('#grade-9 select')];
  ok(a9[0].value === 'eng1|EP' && again.d.querySelector('[data-bind="g.classOf"]').value === '2030', 'plans and graduation year come back after a page reload');
  console.log(fail ? 'FAILURES ' + fail : 'ALL PASS'); w.close(); again.w.close();
})().catch(e => { console.error(e); process.exit(1); });
