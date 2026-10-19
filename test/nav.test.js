const { JSDOM } = require('jsdom'); const fs = require('fs'); const path = require('path'); const ROOT = path.join(__dirname, '..');
(async () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<link[^>]*(googleapis|gstatic)[^>]*>/g, '');
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, url: 'file://' + path.join(ROOT, 'index.html'), beforeParse(w) { const st = {}; Object.defineProperty(w, 'localStorage', { value: { getItem: k => st[k] || null, setItem: (k, v) => { st[k] = v; }, removeItem() {} } }); w.HTMLElement.prototype.scrollIntoView = function () { this.__sc = true; }; } });
  const w = dom.window; await new Promise(r => w.addEventListener('load', r)); await new Promise(r => setTimeout(r, 300)); const d = w.document;
  let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } else console.log('ok  ', m); };
  const links = [...d.querySelectorAll('#sidenav a[href^="#"]')];
  ok(links.length === 14 && links.every(a => d.getElementById(a.getAttribute('href').slice(1))), 'sidebar: 14 links, all point to real sections');
  d.querySelector('a[href="#s-ref"]').click(); ok(d.getElementById('s-ref').open === true, 'Reference link opens its panel');
  d.querySelector('a[href="#grade-10"]').click(); ok(d.querySelector('a[data-spy="grade-10"]').classList.contains('active') && d.querySelector('a[data-spy="s-grades"]').classList.contains('active'), 'grade link highlights with its parent');
  const dot = k => d.querySelector('[data-dot="' + k + '"]').className; ok(/s-part/.test(dot('plans')) && /s-none/.test(dot('g9')), 'dots start: graduation year needed (gold), grades not started (gray)');
  const set = (p, v) => { const el = d.querySelector('[data-bind="' + p + '"]'); el.value = v; el.dispatchEvent(new w.Event('change', { bubbles: true })); }; set('g.classOf', '2030'); ok(/s-done/.test(dot('plans')), 'graduation year turns the dot green');
  const s9 = [...d.querySelectorAll('#grade-9 select')]; s9[0].value = 'eng1|EP'; s9[0].dispatchEvent(new w.Event('change', { bubbles: true })); ok(/s-part/.test(dot('g9')) && /^\d+$/.test(d.getElementById('snTalk').textContent), '9th grade shows heads-ups while the load is incomplete; "Things to Discuss" badge counts items: ' + d.getElementById('snTalk').textContent);
  // stale-file detection
  ok(w.WA.app.syncProblems().length === 0, 'files in sync'); delete w.WA.versions['family.js']; ok(w.WA.app.syncProblems().join() === 'family.js', 'a stale/missing file is detected'); w.WA.app.showSync(); ok(/family\.js/.test((d.getElementById('syncwarn') || {}).textContent || ''), 'red notice names the stale file');
  console.log(fail ? 'FAILURES ' + fail : 'ALL PASS'); w.close();
})().catch(e => { console.error(e); process.exit(1); });
