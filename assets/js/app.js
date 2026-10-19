/* Woodward Academy Four-Year Course Planner — Students & Families (no sign-in, nothing leaves the device) */
(function () {
  'use strict';
  const WA = window.WA, E = WA.engine, CAT = WA.catalog, COC = WA.cocurr, REF = WA.reference, FAM = WA.family, IO = WA.planio, PV = WA.printview;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const SKEY = 'wa_family_planner_v1';
  const BUILD = 'f2026.10.19-a';
  const EXPECT = { 'catalog.js': '2', 'cocurriculars.js': '1', 'engine.js': 'f1', 'reference.js': '2', 'planio.js': '1', 'family.js': '1', 'printview.js': '1' };
  const VOPT = { lenient: true };            // warn-only validation
  const ORD = { 9: '9th', 10: '10th', 11: '11th', 12: '12th' };
  const fmt = n => (Math.round(n * 100) / 100).toString();

  function h(tag, attrs) {
    const el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(k => {
      const v = attrs[k];
      if (k === 'class') el.className = v; else if (k === 'text') el.textContent = v; else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v); else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v);
    });
    for (let i = 2; i < arguments.length; i++) { const c = arguments[i]; if (c == null) continue; el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
    return el;
  }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------------- version check (all files must match) ---------------- */
  function syncProblems() { const v = WA.versions || {}; return Object.keys(EXPECT).filter(f => v[f] !== EXPECT[f]); }
  function showSync() {
    const bad = syncProblems(); let el = document.getElementById('syncwarn');
    if (!bad.length) { if (el) el.remove(); return false; }
    if (!el) { el = h('div', { id: 'syncwarn', class: 'syncwarn', role: 'alert' }); document.body.insertBefore(el, document.body.firstChild); }
    el.innerHTML = '<b>Some site files are out of date or did not load:</b> ' + bad.map(esc).join(', ') + '. Upload the latest version of these files, wait a minute, then hard-refresh this page (Ctrl+Shift+R).';
    return true;
  }

  /* ---------------- state: up to 3 plans ---------------- */
  const blankPlan = name => { const b = E.emptyState(); return { name, plan: b.plan, summer: b.summer, prior: b.prior, cocurr: [], notes: '' }; };
  const fromSan = sp => ({ name: sp.name, plan: sp.plan, summer: sp.summer, prior: sp.prior, cocurr: sp.cocurr, notes: sp.notes });
  const fresh = () => ({ classOf: '', showAll: false, cur: 0, plans: [blankPlan('Plan A'), blankPlan('Plan B'), blankPlan('Plan C')] });
  let S = fresh();
  const P = () => S.plans[S.cur];
  function view(i) {
    const p = S.plans[i == null ? S.cur : i];
    return { info: { studentName: '', studentEmail: '', counselorName: '', counselorEmail: '', classOf: S.classOf, date: '', notes: p.notes }, prior: p.prior, plan: p.plan, summer: p.summer, cocurr: p.cocurr, override: { on: false, reason: '' } };
  }
  const hasWork = p => !!(p.notes.trim() || p.cocurr.some(c => c.name) || p.prior.transfers.length || +p.prior.psCredit > 0 || p.prior.civics8 || p.prior.msLang ||
    E.GRADES.some(g => E.ALL_SLOTS.some(s => p.plan[g][s.k].f || p.plan[g][s.k].s)));

  /* ---------------- saving on this device (localStorage; nothing is sent anywhere) ---------------- */
  let storageOK = true, saveT;
  function persist() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      try { localStorage.setItem(SKEY, JSON.stringify(Object.assign(IO.exportAll(S), { showAll: S.showAll }))); storageOK = true; }
      catch (e) { storageOK = false; const m = $('#saveMsg'); if (m && !m.textContent) m.innerHTML = '<div class="bad">Your browser is not allowing plans to be saved on this device. Use “Download all my plans” to keep your work.</div>'; }
    }, 300);
  }
  function applyAll(r) {
    const f = fresh(); S = f; S.classOf = r.classOf; S.cur = r.cur;
    r.plans.forEach((sp, i) => { S.plans[i] = fromSan(sp); });
  }
  function loadStore() {
    try { const raw = localStorage.getItem(SKEY); if (!raw) return; const r = IO.parse(raw); if (r.kind === 'all') { applyAll(r); S.showAll = !!JSON.parse(raw).showAll; } } catch (e) { /* start fresh */ }
  }

  /* ---------------- bindings ---------------- */
  function ref(path) {
    const [a, k] = path.split('.');
    if (a === 'g') return [S, k]; if (a === 'prior') return [P().prior, k]; if (a === 'p') return [P(), k]; return [null, null];
  }
  const getB = p => { const [o, k] = ref(p); return o ? o[k] : ''; };
  function initBindings() {
    const sel = $('select[data-bind="g.classOf"]');
    for (let y = 2026; y <= 2034; y++) sel.appendChild(h('option', { value: y, text: 'Spring ' + y + ' (Class of ' + y + ')' }));
    $$('[data-bind]').forEach(el => {
      const p = el.dataset.bind;
      el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', () => {
        const [o, k] = ref(p); if (!o) return;
        let val = el.type === 'checkbox' ? el.checked : el.value; if (p === 'prior.psCredit') val = +val;
        o[k] = val;
        if (p === 'g.classOf') { labelGrades(); renderTabs(); }
        if (p === 'p.name') { renderTabs(); persist(); return; }
        if (p === 'p.notes') { update(false); return; }
        update(p.startsWith('prior.'));
      });
    });
  }
  function syncBound() { $$('[data-bind]').forEach(el => { const v = getB(el.dataset.bind); if (el.type === 'checkbox') el.checked = !!v; else el.value = v == null ? '' : v; }); }

  /* ---------------- grade cards ---------------- */
  const selRefs = {}, noteRefs = {}, chipRefs = {};
  function yearLabel(g) { const c = +S.classOf; if (!c) return ''; const s = c - 13 + g; return s + '–' + String(s + 1).slice(2); }
  function labelGrades() {
    const t = S.classOf ? 'Projected graduation: Spring ' + S.classOf : '';
    ['gradBadge1', 'gradBadge2'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = t; });
    $('#snGrad').textContent = S.classOf ? 'Graduating Spring ' + S.classOf : 'Choose a graduation year in Step 1';
    E.GRADES.forEach(g => { const y = chipRefs[g] && chipRefs[g].yr; if (y) y.textContent = yearLabel(g) ? '· ' + yearLabel(g) : ''; });
  }
  function buildGrades() {
    const host = $('#grades'); host.innerHTML = '';
    E.GRADES.forEach(g => {
      selRefs[g] = {}; noteRefs[g] = {}; chipRefs[g] = {};
      const yr = h('span', { class: 'yr' }), chips = h('div', { class: 'chips' }); chipRefs[g].yr = yr; chipRefs[g].chips = chips;
      const body = h('div', { class: 'grade-body' });
      const rowFor = (slot, label, summer) => {
        selRefs[g][slot.k] = {};
        const mk = half => {
          const sel = h('select', { 'aria-label': ORD[g] + ' grade ' + label + (summer ? '' : half ? ' spring' : ' fall or full year') });
          sel.addEventListener('change', () => onPick(g, slot.k, half, sel.value, !!summer)); selRefs[g][slot.k][half] = sel; return sel;
        };
        const notes = h('div', { class: 'notes' }); noteRefs[g][slot.k] = notes;
        if (summer) return h('div', { class: 'row' }, h('div', { class: 'lab', text: label }), h('div', { class: 'col' }, h('label', { text: 'Summer semester course' }), mk(0)), h('div', {}), notes);
        return h('div', { class: 'row' }, h('div', { class: 'lab', text: label }), h('div', { class: 'col' }, h('label', { text: 'Fall / Full year' }), mk(0)), h('div', { class: 'col' }, h('label', { text: 'Spring' }), mk(1)), notes);
      };
      body.appendChild(h('div', { class: 'sec-title', text: 'Academic — core disciplines' }));
      E.CORE_SLOTS.forEach(s => body.appendChild(rowFor(s, s.label)));
      body.appendChild(h('div', { class: 'sec-title', text: 'Electives' }));
      E.ELEC_SLOTS.forEach(s => body.appendChild(rowFor(s, s.label)));
      if (g < 12) { body.appendChild(h('div', { class: 'sec-title', text: 'Summer after ' + ORD[g] + ' grade (optional forward credit)' })); E.SUMMER_SLOTS.forEach(s => body.appendChild(rowFor(s, s.label, true))); }
      const lm = h('div', { class: 'loadmsgs' }); chipRefs[g].msgs = lm; body.appendChild(lm);
      host.appendChild(h('article', { class: 'grade', id: 'grade-' + g }, h('div', { class: 'grade-head' }, h('h3', { text: ORD[g] + ' Grade' }), yr, chips), body));
    });
    labelGrades();
  }
  function onPick(g, slot, half, val, summer) {
    const p = P();
    if (summer) p.summer[g][slot] = val;
    else { const cell = p.plan[g][slot]; if (half === 0) { cell.f = val; const x = E.parseSel(val); if (x && x.c.t === 'Y') cell.s = ''; } else cell.s = val; }
    update(true);
  }

  /* ---------------- select filling ---------------- */
  function fillSelect(sel, opts, value, placeholder, cls) {
    const items = opts.groups.flatMap(g => g.items), have = new Set(items.map(i => i.value));
    const sig = placeholder + '|' + items.map(i => i.value + i.state).join(',') + '|' + opts.locked.map(i => i.value).join(',') + '|' + (value && !have.has(value) ? value : '');
    if (sel.dataset.sig !== sig) {
      sel.innerHTML = ''; sel.appendChild(h('option', { value: '', text: placeholder }));
      if (value && !have.has(value)) { const x = E.parseSel(value); if (x) sel.appendChild(h('option', { value, text: '⚠ ' + E.courseLabel(x.c, x.lv) + ' — check availability' })); }
      opts.groups.forEach(g => { const og = h('optgroup', { label: g.group }); g.items.forEach(i => og.appendChild(h('option', { value: i.value, text: i.label, class: i.state === 'approval' ? 'appr' : i.state === 'blocked' ? 'warnopt' : '' }))); sel.appendChild(og); });
      if (opts.locked.length) { const og = h('optgroup', { label: 'Not yet available — prerequisite needed' }); opts.locked.forEach(i => og.appendChild(h('option', { value: i.value, disabled: true, text: i.label + ' — ' + i.reason }))); sel.appendChild(og); }
      sel.dataset.sig = sig;
    }
    sel.value = value || ''; sel.classList.toggle('filled', !!value); sel.classList.toggle('warn', cls === 'warn');
  }

  /* ---------------- master update ---------------- */
  function update(userAction) {
    const v = view(), val = E.validateSelections(v, VOPT), SO = { showAll: S.showAll };
    E.GRADES.forEach(g => {
      const cellsFor = (slot, summer) => {
        const cell = summer ? { f: v.summer[g][slot.k], s: '' } : v.plan[g][slot.k], f = E.parseSel(cell.f);
        fillSelect(selRefs[g][slot.k][0], E.optionsFor(v, g, slot.k, 0, SO), cell.f, slot.dept || summer ? '— none —' : '— open period —', stClass(val[g + '|' + slot.k + '|f']));
        if (!summer) {
          const selS = selRefs[g][slot.k][1];
          if (f && f.c.t === 'Y') { selS.innerHTML = ''; selS.appendChild(h('option', { value: '', text: 'Year-long course' })); selS.dataset.sig = 'Y'; selS.disabled = true; selS.classList.remove('filled', 'warn'); }
          else { selS.disabled = false; fillSelect(selS, E.optionsFor(v, g, slot.k, 1, SO), cell.s, '— none —', stClass(val[g + '|' + slot.k + '|s'])); }
        }
        const box = noteRefs[g][slot.k]; box.innerHTML = '';
        ['f', 's'].forEach(w => {
          const x = val[g + '|' + slot.k + '|' + w]; if (!x) return;
          const pfx = summer ? '' : (w === 'f' ? (f && f.c.t === 'Y' ? '' : 'Fall: ') : 'Spring: ');
          if (x.state === 'blocked') box.appendChild(h('div', { class: 'w', text: '⚠ Heads-up: ' + pfx + x.course + ' — ' + x.blockedReason + '.' }));
          (x.approvals || []).forEach(a => box.appendChild(h('div', { class: 'w', text: '⚑ ' + pfx + x.course + ': ' + a })));
          (x.msgs || []).forEach(a => box.appendChild(h('div', { class: 'i', text: 'ⓘ ' + pfx + x.course + ': ' + a })));
        });
        box.style.display = box.children.length ? '' : 'none';
      };
      E.CORE_SLOTS.forEach(s => cellsFor(s, false)); E.ELEC_SLOTS.forEach(s => cellsFor(Object.assign({ dept: '' }, s), false));
      if (g < 12) E.SUMMER_SLOTS.forEach(s => cellsFor(s, true));
    });
    const Pb = E.problems(v, VOPT);
    renderChips(Pb); renderTracker(Pb.tracker); renderTalk(Pb); renderNav(Pb); renderGlance();
    if (userAction) celebrateDiff(Pb.tracker); else prevMet = metSet(Pb.tracker);
    persist();
  }
  const stClass = x => (!x ? '' : (x.state === 'blocked' || x.state === 'approval') ? 'warn' : '');
  const metSet = t => new Set(t.areas.filter(a => a.met).map(a => a.key));
  let prevMet = null;

  function renderChips(Pb) {
    E.GRADES.forEach(g => {
      const chips = chipRefs[g].chips; chips.innerHTML = '';
      const list = Pb.load[g], hasSel = E.ALL_SLOTS.some(s => P().plan[g][s.k].f || P().plan[g][s.k].s);
      const blocked = Object.values(Pb.validation).filter(x => x.grade === g && x.state === 'blocked').length, n = list.length + blocked;
      chips.appendChild(h('span', { class: 'chip', text: 'Cumulative ' + Pb.tracker.cum[g] + ' units' }));
      if (hasSel) chips.appendChild(n ? h('span', { class: 'chip warn', text: n + ' heads-up' + (n > 1 ? 's' : '') }) : h('span', { class: 'chip ok', text: 'Looks good' }));
      const lm = chipRefs[g].msgs; lm.innerHTML = ''; list.forEach(x => lm.appendChild(h('div', { class: 'warn', text: '⚑ ' + x.text })));
    });
  }

  /* ---------------- tracker ---------------- */
  const STX = { done: 'Complete', part: 'In progress', none: 'Not started' };
  function renderTracker(t) {
    const host = $('#trackerAreas'); host.innerHTML = '';
    t.areas.forEach(a => {
      const el = h('div', { class: 'area ' + a.status + (a.key === 'total' ? ' total' : ''), id: 'area-' + a.key },
        h('div', { class: 'area-top' }, h('span', { class: 'nm', text: a.label }), h('span', { class: 'st', text: (a.status === 'done' ? '✓ ' : a.status === 'part' ? '◐ ' : '○ ') + STX[a.status] })),
        h('div', { class: 'num' }, fmt(a.have), h('span', { text: ' / ' + fmt(a.req) + ' units' })),
        h('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': a.pct, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-label': a.label + ' credits' }, h('i', { style: 'width:' + a.pct + '%' })),
        h('div', { class: 'det', text: a.detail }));
      if (a.subs && a.subs.length) { const s = h('div', { class: 'subs' }); a.subs.forEach(([n, ok]) => s.appendChild(h('span', { class: 'sub ' + (ok ? 'y' : 'n'), text: (ok ? '✓ ' : '○ ') + n }))); el.appendChild(s); }
      host.appendChild(el);
    });
    const g = $('#trackerGrades'); g.innerHTML = '';
    t.ghsa.concat([{ grade: 12, need: 22, have: t.cum[12], met: t.cum[12] >= 22 }]).forEach(x => {
      const st = x.met ? 'done' : x.have > 0 ? 'part' : 'none';
      g.appendChild(h('div', { class: 'mini ' + st }, h('div', { html: 'By end of <b>' + ORD[x.grade] + ' grade</b>' }), h('div', { class: 'big', text: fmt(x.have) + ' / ' + x.need }), h('small', { text: x.met ? '✓ checkpoint met' : 'units needed: ' + fmt(Math.max(0, x.need - x.have)) })));
    });
    const s = $('#trackerSchol'); s.innerHTML = ''; const r = t.rigor, n = t.ncaa;
    s.appendChild(h('div', { class: 'mini ' + (r.met ? 'done' : r.have ? 'part' : 'none') }, h('div', { html: '<b>HOPE / Zell Miller rigor courses</b>' }), h('div', { class: 'big', text: r.have + ' / ' + r.need }), h('small', { text: 'Rigor-list courses planned (4 needed). Also requires a 3.0 HOPE GPA (Zell: 3.7 + test score).' })));
    s.appendChild(h('div', { class: 'mini ' + (n.met ? 'done' : n.total ? 'part' : 'none') }, h('div', { html: '<b>NCAA Division I core courses</b>' }), h('div', { class: 'big', text: fmt(n.total) + ' / 16' }), h('small', { text: n.parts.map(p => p[0] + ' ' + fmt(p[1]) + '/' + p[2]).join(' · ') })));
    const sb = t.areas.find(a => a.key === 'total');
    $('#sbTotal').textContent = fmt(Math.min(22, sb.raw || 0)) + ' / 22'; $('#sbFill').style.width = Math.min(100, (sb.raw || 0) / 22 * 100) + '%'; $('#sbFill').classList.toggle('full', (sb.raw || 0) >= 22);
    $('#sbReq').textContent = t.areas.filter(a => a.met).length + ' of ' + t.areas.length;
  }

  /* ---------------- "things to discuss" ---------------- */
  function talkData(Pb) {
    const t = { reqs: [], prereq: [], load: [], approvals: [] };
    Pb.tracker.areas.forEach(a => { if (!a.met) t.reqs.push(a.label + ': ' + fmt(a.have) + ' of ' + fmt(a.req) + ' units planned'); });
    Object.values(Pb.validation).forEach(x => { if (x.state === 'blocked') t.prereq.push(ORD[x.grade] + ' · ' + x.course + ' — ' + x.blockedReason); });
    E.GRADES.forEach(g => Pb.load[g].forEach(x => t.load.push(ORD[g] + ': ' + x.text)));
    Pb.approvals.forEach(a => t.approvals.push(ORD[a.grade] + ' · ' + a.course + ' — ' + a.note));
    return t;
  }
  const talkCount = t => t.prereq.length + t.load.length + t.approvals.length + t.reqs.length;
  function renderTalk(Pb) {
    const t = talkData(Pb), box = $('#talkBox'); box.innerHTML = '';
    const empty = !E.GRADES.some(g => E.ALL_SLOTS.some(s => P().plan[g][s.k].f || P().plan[g][s.k].s));
    if (empty) { box.appendChild(h('p', { class: 'muted', text: 'Start choosing courses in Step 3 and the planner will list topics to discuss here.' })); return; }
    const sec = (title, arr, none) => { const d = h('div', { class: 'talk-sec' }, h('h4', { text: title })); if (arr.length) { const u = h('ul'); arr.forEach(x => u.appendChild(h('li', { text: x }))); d.appendChild(u); } else d.appendChild(h('p', { class: 'muted', text: none })); return d; };
    box.appendChild(sec('Graduation requirements still open', t.reqs, 'None — every requirement is planned.'));
    box.appendChild(sec('Approvals, auditions or applications (⚑)', t.approvals, 'None flagged.'));
    box.appendChild(sec('Prerequisite or grade-level heads-ups (⚠)', t.prereq, 'None flagged.'));
    box.appendChild(sec('Course-load notes', t.load, 'None flagged.'));
  }

  /* ---------------- plans: tabs, copy, clear, compare ---------------- */
  function renderTabs() {
    const tabs = $('#planTabs'); tabs.innerHTML = '';
    S.plans.forEach((p, i) => tabs.appendChild(h('button', { type: 'button', role: 'tab', class: 'plan-tab' + (i === S.cur ? ' on' : ''), 'aria-selected': i === S.cur ? 'true' : 'false', onclick: () => switchPlan(i) }, h('span', { class: 'pt-l', text: 'ABC'[i] }), h('span', { class: 'pt-n', text: p.name }))));
    const sb = $('#sbPlans'); sb.innerHTML = '';
    S.plans.forEach((p, i) => sb.appendChild(h('button', { type: 'button', class: 'sb-chip' + (i === S.cur ? ' on' : ''), title: p.name, 'aria-label': 'Switch to ' + p.name, 'aria-pressed': i === S.cur ? 'true' : 'false', text: 'ABC'[i], onclick: () => switchPlan(i) })));
    const cp = $('#copyTo'); cp.innerHTML = ''; S.plans.forEach((p, i) => { if (i !== S.cur) cp.appendChild(h('option', { value: i, text: p.name })); });
    $('#oneName').textContent = P().name; $('#snName').textContent = P().name;
  }
  function switchPlan(i) {
    if (i === S.cur) return; S.cur = i; syncBound(); renderTabs(); renderCoc(); renderTransfers(); $$('#grades select').forEach(s => { delete s.dataset.sig; }); update(false);
  }
  async function copyPlan() {
    const to = +$('#copyTo').value; if (isNaN(to) || to === S.cur) return;
    if (hasWork(S.plans[to]) && !(await ask('Replace ' + S.plans[to].name + '?', '<p><b>' + esc(S.plans[to].name) + '</b> already has choices in it. Copying will replace them with a copy of <b>' + esc(P().name) + '</b>.</p>', 'Replace'))) return;
    const sp = IO.sanitizePlan(Object.assign({}, P(), { classOf: S.classOf })); sp.name = (P().name + ' (copy)').slice(0, 40); S.plans[to] = fromSan(sp);
    renderTabs(); update(false); msg('Copied to ' + S.plans[to].name + '. Use the plan tabs to switch.', 'ok');
  }
  async function clearPlan() {
    if (hasWork(P()) && !(await ask('Clear this plan?', '<p>This removes every choice in <b>' + esc(P().name) + '</b>. It cannot be undone unless you have downloaded the plan.</p>', 'Clear plan'))) return;
    S.plans[S.cur] = blankPlan(P().name); syncBound(); renderCoc(); renderTransfers(); $$('#grades select').forEach(s => { delete s.dataset.sig; }); update(false);
  }
  function stats(i) {
    const v = view(i), Pb = E.problems(v, VOPT), recs = E.allTaken(v).filter(r => r.src === 'wa'), t = Pb.tracker;
    const blocked = Object.values(Pb.validation).filter(x => x.state === 'blocked').length, load = E.GRADES.reduce((n, g) => n + Pb.load[g].length, 0);
    return { met: t.areas.filter(a => a.met).length + ' of ' + t.areas.length, credits: fmt(t.areas.find(a => a.key === 'total').raw || 0), ap: recs.filter(r => r.lv === 'AP').length, hp: recs.filter(r => r.lv === 'HP').length, rigor: t.rigor.have, ncaa: fmt(t.ncaa.total), heads: blocked + load + Pb.approvals.length, empty: !hasWork(S.plans[i]) };
  }
  function renderGlance() {
    const tb = $('#glance'); tb.innerHTML = ''; const st = S.plans.map((p, i) => stats(i));
    const rows = [['Graduation requirements complete', 'met'], ['Credits planned (22 needed)', 'credits'], ['AP courses', 'ap'], ['Honors (HP) courses', 'hp'], ['HOPE rigor courses (4 needed)', 'rigor'], ['NCAA core credits (16 needed)', 'ncaa'], ['Heads-ups to discuss', 'heads']];
    const head = h('tr', {}, h('th', { text: '' })); S.plans.forEach((p, i) => head.appendChild(h('th', { class: i === S.cur ? 'cur' : '', text: p.name }))); tb.appendChild(h('thead', {}, head));
    const body = h('tbody'); rows.forEach(([lab, k]) => { const tr = h('tr', {}, h('th', { scope: 'row', text: lab })); st.forEach((x, i) => tr.appendChild(h('td', { class: i === S.cur ? 'cur' : '', text: x.empty ? '—' : String(x[k]) }))); body.appendChild(tr); });
    tb.appendChild(body);
  }

  /* ---------------- celebration ---------------- */
  const STAR = '<svg viewBox="0 0 24 24"><path d="M12 1.5l3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 17.2 5.7 20.9l1.5-7.1L1.8 8.9 9 8.1z" fill="%C" stroke="#fff" stroke-width="1"/></svg>';
  const CAP = '<svg class="cap" viewBox="0 0 96 76" aria-hidden="true"><polygon points="48,6 94,26 48,46 2,26" fill="#002e53"/><path d="M22 38v16c0 7 12 14 26 14s26-7 26-14V38L48 50z" fill="#4c768e"/><path d="M84 29v28" stroke="#f4a72a" stroke-width="3.5" stroke-linecap="round"/><circle cx="84" cy="61" r="5.5" fill="#f4a72a"/><polygon points="48,6 94,26 48,46 2,26" fill="none" stroke="#fff" stroke-width="1.2" opacity=".5"/></svg>';
  const celQueue = []; let celBusy = false;
  function celebrateDiff(t) { const now = metSet(t); if (prevMet) t.areas.forEach(a => { if (a.met && !prevMet.has(a.key)) celQueue.push(a); }); prevMet = now; runCel(); }
  function runCel() {
    if (celBusy || !celQueue.length) return; celBusy = true;
    const a = celQueue.shift(), host = $('#celebrate'); host.innerHTML = ''; host.classList.add('on');
    const colors = ['#f4a72a', '#9d2235', '#47a972', '#6fccdd', '#ffc513', '#df6460', '#002e53'], reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    host.appendChild(h('div', { class: 'cel-card' }, h('div', { class: 'icons' }, h('img', { src: 'assets/img/wa-icon.png', alt: '' }), h('span', { html: CAP })), h('h4', { text: a.key === 'total' ? 'All 22 units planned!' : a.label + ' complete!' }), h('p', { text: a.key === 'total' ? 'Ready to graduate' : 'Graduation requirement met' })));
    if (!reduce) for (let i = 0; i < 30; i++) {
      const ang = (i / 30) * Math.PI * 2 + Math.random() * 0.4, dist = 150 + Math.random() * 190, st = h('span', { class: 'star', html: STAR.replace('%C', colors[i % colors.length]) });
      st.style.setProperty('--dx', Math.round(Math.cos(ang) * dist) + 'px'); st.style.setProperty('--dy', Math.round(Math.sin(ang) * dist) + 'px'); st.style.setProperty('--r', Math.round(Math.random() * 360 - 180) + 'deg');
      st.style.setProperty('--s', (0.7 + Math.random() * 1.1).toFixed(2)); st.style.setProperty('--d', (Math.random() * 0.25).toFixed(2) + 's'); host.appendChild(st);
    }
    host.setAttribute('aria-hidden', 'false'); host.setAttribute('role', 'status');
    setTimeout(() => { host.classList.remove('on'); host.innerHTML = ''; host.setAttribute('aria-hidden', 'true'); celBusy = false; setTimeout(runCel, 120); }, reduce ? 1800 : 2700);
  }

  /* ---------------- transfer credit + cocurricular rows ---------------- */
  const AREAS = [['eng', 'English'], ['math', 'Mathematics'], ['ss', 'Social Studies'], ['sci', 'Science'], ['wl', 'World Language'], ['pe', 'Physical Education'], ['fa', 'Fine Arts'], ['elec', 'Elective']];
  const WHEN = [['9', 'Grade 9'], ['10', 'Grade 10'], ['11', 'Grade 11'], ['12', 'Grade 12'], ['s9', 'Summer after 9th'], ['s10', 'Summer after 10th'], ['s11', 'Summer after 11th']];
  let equivHTML = null;
  function equivOptions() {
    if (equivHTML) return equivHTML; let o = '<option value="">— No Woodward equivalent (enter subject area) —</option>';
    ['eng', 'math', 'ss', 'sci', 'wl', 'cs', 'pa', 'va', 'pe', 'deb', 'jr'].forEach(d => { o += '<optgroup label="' + esc(CAT.DEPTS[d]) + '">'; CAT.list.filter(c => c.dept === d).forEach(c => c.lv.forEach(lv => { o += '<option value="' + c.id + '|' + lv + '">' + esc(E.courseLabel(c, lv)) + '</option>'; })); o += '</optgroup>'; });
    return (equivHTML = o);
  }
  function renderTransfers() {
    const host = $('#transferRows'); host.innerHTML = '';
    P().prior.transfers.forEach((t, i) => {
      const title = h('input', { type: 'text', value: t.title || '', placeholder: 'e.g., Biology — another school', maxlength: 60 }); title.addEventListener('input', () => { t.title = title.value; persist(); });
      const eq = h('select', { html: equivOptions() }); eq.value = t.equiv || '';
      const area = h('select', { html: AREAS.map(a => '<option value="' + a[0] + '">' + a[1] + '</option>').join('') }); area.value = t.area || 'elec'; area.disabled = !!t.equiv;
      const lang = h('select', { html: Object.keys(CAT.LANGS).map(k => '<option value="' + k + '">' + CAT.LANGS[k] + '</option>').join('') }); lang.value = t.lang || 'fr';
      const cr = h('select', { html: [0.5, 1, 1.5, 2, 2.5, 3, 4].map(n => '<option value="' + n + '">' + n + '</option>').join('') }); cr.value = t.cr || 1;
      const when = h('select', { html: WHEN.map(a => '<option value="' + a[0] + '">' + a[1] + '</option>').join('') }); when.value = t.when || '9';
      eq.addEventListener('change', () => { t.equiv = eq.value; const x = E.parseSel(eq.value); if (x) { t.cr = x.c.cr; if (!t.title) t.title = E.courseLabel(x.c, x.lv); } renderTransfers(); update(true); });
      area.addEventListener('change', () => { t.area = area.value; renderTransfers(); update(true); });
      lang.addEventListener('change', () => { t.lang = lang.value; update(true); }); cr.addEventListener('change', () => { t.cr = +cr.value; update(true); }); when.addEventListener('change', () => { t.when = when.value; update(true); });
      if (!t.area) t.area = 'elec'; if (!t.cr) t.cr = 1; if (!t.when) t.when = '9'; if (!t.lang) t.lang = 'fr';
      const showLang = !t.equiv && t.area === 'wl';
      host.appendChild(h('div', { class: 'tr-row' }, h('label', { text: 'Course / school' }, title), h('label', { text: 'Woodward equivalent' }, eq), h('label', { text: showLang ? 'Area · language' : 'Subject area' }, area, showLang ? lang : null), h('label', { text: 'Credits' }, cr), h('label', { text: 'Completed' }, when),
        h('button', { type: 'button', class: 'x', 'aria-label': 'Remove transfer credit', text: '×', onclick: () => { P().prior.transfers.splice(i, 1); renderTransfers(); update(true); } })));
    });
  }
  const noteFor = n => { const a = COC.list.find(x => x.name === n); return a ? a.note : ''; };
  function cocOptions() {
    const cats = []; COC.list.forEach(a => { if (!cats.includes(a.cat)) cats.push(a.cat); });
    return '<option value="">— choose an activity —</option>' + cats.map(c => '<optgroup label="' + esc(c) + '">' + COC.list.filter(a => a.cat === c).map(a => '<option value="' + esc(a.name) + '">' + esc(a.name) + '</option>').join('') + '</optgroup>').join('') + '<option value="__other">Other (write in)…</option>';
  }
  function renderCoc() {
    const host = $('#cocRows'); host.innerHTML = ''; const list = P().cocurr; if (!list.length) list.push({ name: '', status: 'active' });
    list.forEach((c, i) => {
      const known = !c.name || COC.list.some(a => a.name === c.name);
      const act = h('select', { html: cocOptions(), 'aria-label': 'Activity' }); act.value = known ? c.name : '__other';
      const other = h('input', { type: 'text', placeholder: 'Activity name', value: known ? '' : c.name, maxlength: 100 }); other.style.display = known ? 'none' : '';
      const stat = h('select', { html: COC.STATUS.map(s => '<option value="' + s.v + '">' + s.label + '</option>').join(''), 'aria-label': 'Participation' }); stat.value = c.status || 'active';
      const hint = h('small', { text: noteFor(c.name) });
      act.addEventListener('change', () => { if (act.value === '__other') { other.style.display = ''; c.name = other.value; } else { other.style.display = 'none'; c.name = act.value; } hint.textContent = noteFor(c.name); update(false); });
      other.addEventListener('input', () => { c.name = other.value; persist(); }); stat.addEventListener('change', () => { c.status = stat.value; update(false); });
      host.appendChild(h('div', { class: 'coc-row' }, h('div', {}, act, other, hint), stat, h('button', { type: 'button', class: 'x', 'aria-label': 'Remove activity', text: '×', onclick: () => { P().cocurr.splice(i, 1); renderCoc(); update(false); } })));
    });
  }

  /* ---------------- help + reference + disclaimer ---------------- */
  function renderHelp() {
    const how = $('#howto'); FAM.howto.forEach(([t, d]) => how.appendChild(h('li', {}, h('b', { text: t + ' ' }), d)));
    const gl = $('#glossary'); FAM.glossary.forEach(([t, d]) => { gl.appendChild(h('dt', { text: t })); gl.appendChild(h('dd', { text: d })); });
    const q = $('#questions'); FAM.questions.forEach(x => q.appendChild(h('li', { text: x })));
    const dd = $('#disclaimer'); dd.innerHTML = ''; dd.appendChild(h('h4', { text: FAM.disclaimer.title.toUpperCase() })); dd.appendChild(h('p', { text: FAM.disclaimer.text }));
  }
  function renderRef() {
    const host = $('#refBody'); host.innerHTML = '';
    REF.sections.forEach(s => {
      const d = h('div', { class: 'ref-sec' }, h('h4', { text: s.title }));
      if (s.rows) { const t = h('table'); s.rows.forEach(r => t.appendChild(h('tr', {}, h('td', { text: r[0] }), h('td', { text: r[1] })))); d.appendChild(t); }
      if (s.items) { const u = h('ul'); s.items.forEach(i => u.appendChild(h('li', { text: i }))); d.appendChild(u); }
      host.appendChild(d);
    });
    host.appendChild(h('p', { class: 'muted', text: 'Reference current as of ' + REF.updated + '.' }));
  }

  /* ---------------- sidebar: status dots + scroll-spy ---------------- */
  function setDot(key, st, label) { const el = document.querySelector('[data-dot="' + key + '"]'); if (!el) return; el.className = 'sn-dot s-' + st; el.title = label; el.setAttribute('aria-label', label); }
  function renderNav(Pb) {
    setDot('plans', S.classOf ? 'done' : 'part', S.classOf ? 'Graduation year chosen' : 'Choose a graduation year');
    const pr = P().prior, hasPrior = +pr.psCredit > 0 || pr.civics8 || pr.gat || pr.placement || pr.msLang || pr.msMath !== 'alg1' || pr.transfers.length > 0;
    setDot('prior', hasPrior ? 'done' : 'none', hasPrior ? 'Prior credit / placement entered' : 'Optional — nothing entered');
    let done = 0, warn = 0, sel = 0;
    E.GRADES.forEach(g => {
      const hasSel = E.ALL_SLOTS.some(s => P().plan[g][s.k].f || P().plan[g][s.k].s);
      const n = Pb.load[g].length + Object.values(Pb.validation).filter(x => x.grade === g && x.state === 'blocked').length, st = !hasSel ? 'none' : n ? 'part' : 'done';
      if (hasSel) sel++; if (st === 'done') done++; if (st === 'part') warn++;
      setDot('g' + g, st, !hasSel ? 'Not started' : n ? n + ' heads-up(s)' : 'Looks good');
    });
    setDot('grades', warn ? 'part' : done === 4 ? 'done' : sel ? 'part' : 'none', warn ? 'Some heads-ups' : done === 4 ? 'All four grades planned' : sel ? 'In progress' : 'Not started');
    const hasCoc = P().cocurr.some(c => c.name); setDot('coc', hasCoc ? 'done' : 'none', hasCoc ? 'Activities entered' : 'Optional — nothing entered');
    setDot('notes', P().notes.trim() ? 'done' : 'none', P().notes.trim() ? 'Notes entered' : 'Optional — no notes');
    const t = Pb.tracker, n = t.areas.filter(a => a.met).length, b = $('#snTrk'); b.textContent = n + '/' + t.areas.length; b.className = 'sn-badge ' + (n === t.areas.length ? 's-done' : n ? 's-part' : 's-err');
    const tc = talkCount(talkData(Pb)), tb = $('#snTalk'); tb.textContent = String(tc); tb.className = 'sn-badge ' + (tc ? 's-part' : 's-done');
  }
  function initNav() {
    const ids = ['s-help', 's-plans', 's-prior', 's-grades', 'grade-9', 'grade-10', 'grade-11', 'grade-12', 's-cocurr', 's-notes', 's-tracker', 's-talk', 's-ref', 's-save'];
    const links = {}; $$('#sidenav a[data-spy]').forEach(a => { links[a.dataset.spy] = a; });
    $$('#sidenav a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1), t = document.getElementById(id); if (!t) return; e.preventDefault(); if (id === 's-ref') t.open = true;
      t.scrollIntoView({ behavior: 'smooth', block: 'start' }); try { history.replaceState(null, '', '#' + id); } catch (x) { /* ignore */ } mark(id);
    }));
    const vis = new Set();
    function mark(id) {
      Object.keys(links).forEach(k => links[k].classList.remove('active')); const grade = id && id.indexOf('grade-') === 0 ? id : null;
      if (grade) { links[grade].classList.add('active'); links['s-grades'].classList.add('active'); } else if (id && links[id]) links[id].classList.add('active');
      const cur = grade ? links[grade] : (id && links[id]); if (cur && window.innerWidth <= 1040 && cur.scrollIntoView) { try { cur.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (x) { /* ignore */ } }
    }
    function pick() { if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) return mark('s-save'); const g = ids.filter(i => i.indexOf('grade-') === 0 && vis.has(i))[0]; mark(g || ids.filter(i => vis.has(i))[0] || null); }
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => { es.forEach(en => { if (en.isIntersecting) vis.add(en.target.id); else vis.delete(en.target.id); }); pick(); }, { rootMargin: '-12% 0px -62% 0px' });
      ids.forEach(i => { const el = document.getElementById(i); if (el) io.observe(el); }); window.addEventListener('scroll', () => { if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) mark('s-save'); }, { passive: true });
    }
    mark('s-help');
  }

  /* ---------------- dialogs ---------------- */
  function ask(title, html, okText) {
    return new Promise(res => {
      const d = $('#dlg'); if (!d || typeof d.showModal !== 'function') { res(window.confirm(title)); return; }
      $('#dlgBody').innerHTML = '<h3>' + esc(title) + '</h3>' + html; const a = $('#dlgActions'); a.innerHTML = '';
      a.appendChild(h('button', { type: 'button', class: 'btn ghost', text: 'Cancel', onclick: () => { d.close(); res(false); } }));
      a.appendChild(h('button', { type: 'button', class: 'btn primary', text: okText || 'OK', onclick: () => { d.close(); res(true); } }));
      d.addEventListener('cancel', () => res(false), { once: true }); d.showModal();
    });
  }
  function msg(text, kind) { $('#saveMsg').innerHTML = '<div class="' + (kind === 'ok' ? 'ok' : 'bad') + '">' + esc(text) + '</div>'; }

  /* ---------------- downloads, files, print ---------------- */
  const slug = s => String(s || 'plan').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'plan';
  function download(name, obj) {
    const a = h('a', { href: URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' })), download: name });
    document.body.appendChild(a); a.click(); a.remove();
  }
  function saveAll() { download('WA-course-plans-' + (S.classOf || 'draft') + '.json', IO.exportAll(S)); msg('Downloaded all three plans. Keep the file somewhere safe; use “Open a file…” to reload them later.', 'ok'); }
  function saveOne() { download('WA-PATH-plan-' + slug(P().name) + '-' + (S.classOf || 'draft') + '.json', IO.exportOne(P(), S.classOf)); msg('Downloaded “' + P().name + '” for your counselor. Email it or bring it to your PATH meeting — your counselor can import it into their planner.', 'ok'); }
  function openFile(file) {
    const r = new FileReader();
    r.onload = async () => {
      let res; try { res = IO.parse(String(r.result)); } catch (e) { msg(e.message, 'bad'); return; }
      if (res.kind === 'all') {
        if (S.plans.some(hasWork) && !(await ask('Replace all my plans?', '<p>This file contains up to three plans. Opening it replaces the three plans currently on this device.</p>', 'Replace'))) return;
        applyAll(res); S.showAll = S.showAll; fullRender(); msg('Opened your saved plans.', 'ok');
      } else {
        if (hasWork(P()) && !(await ask('Replace ' + P().name + '?', '<p>This file is a single plan. Opening it replaces the choices in <b>' + esc(P().name) + '</b>.</p>', 'Replace'))) return;
        S.plans[S.cur] = fromSan(res.plan); if (!S.classOf && res.plan.classOf) S.classOf = res.plan.classOf; fullRender(); msg('Opened the plan into “' + P().name + '”.', 'ok');
      }
    };
    r.readAsText(file);
  }
  function priorLines(pr) {
    const ms = [], mathTxt = { alg1: 'Algebra 1 (CP/EP)', alg1hp: 'Algebra 1 (HP)', geohp: 'Algebra 1 (HP) + Geometry (HP)' }[pr.msMath];
    if (+pr.psCredit > 0) ms.push('Physical Science (8th grade): ' + pr.psCredit + ' unit science credit'); if (pr.civics8) ms.push('Government & Economics HP completed in 8th grade');
    if (mathTxt) ms.push('Middle School math: ' + mathTxt); if (pr.msLang) { const [c, l] = pr.msLang.split(':'); ms.push('Middle School ' + CAT.LANGS[c] + ': Level ' + (l === '2' ? '1 & 2' : '1') + ' complete'); }
    if (pr.gat) ms.push('GAT HP completed'); if (pr.placement) ms.push('Language placement / heritage speaker');
    pr.transfers.filter(x => +x.cr > 0).forEach(x => { const q = E.parseSel(x.equiv); ms.push('Transfer: ' + (x.title || (q ? E.courseLabel(q.c, q.lv) : 'credit')) + ' — ' + x.cr + ' unit(s)'); });
    return ms;
  }
  function printData() {
    const v = view(), Pb = E.problems(v, VOPT), t = Pb.tracker;
    return {
      planName: P().name, classOf: S.classOf, printedOn: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      grades: E.GRADES.map(g => ({ grade: g, label: ORD[g] + ' Grade', year: yearLabel(g), rows: E.CORE_SLOTS.map(s => ({ label: s.label, kind: 'core', cells: E.cellText(v, g, s.k) })).concat(E.ELEC_SLOTS.map(s => ({ label: s.label, kind: 'elec', cells: E.cellText(v, g, s.k) }))), summer: g < 12 ? E.summerText(v, g) : [] })),
      areas: t.areas, ghsa: t.ghsa.map(x => ORD[x.grade] + ' ' + fmt(x.have) + '/' + x.need + (x.met ? ' ✓' : '')).concat(['12th ' + fmt(t.cum[12]) + '/22' + (t.cum[12] >= 22 ? ' ✓' : '')]).join('  ·  '),
      rigor: t.rigor.have, ncaa: t.ncaa.total, prior: priorLines(P().prior), talk: talkData(Pb), notes: P().notes.trim(),
      cocurr: { active: P().cocurr.filter(c => c.name && c.status === 'active').map(c => c.name), interest: P().cocurr.filter(c => c.name && c.status === 'interest').map(c => c.name) },
      disclaimer: FAM.disclaimer, reference: REF, questions: FAM.questions, opts: { reference: $('#pvRef').checked, questions: $('#pvQ').checked }
    };
  }
  function printPlan() {
    const pv = $('#printView'); pv.innerHTML = PV.build(printData()); pv.setAttribute('aria-hidden', 'false');
    const done = () => { pv.innerHTML = ''; pv.setAttribute('aria-hidden', 'true'); window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done); window.print();
  }
  async function wipeAll() {
    if (!(await ask('Clear everything on this device?', '<p>This deletes all three plans saved in this browser. Download them first if you want to keep them.</p>', 'Clear everything'))) return;
    try { localStorage.removeItem(SKEY); } catch (e) { /* ignore */ }
    S = fresh(); fullRender(); msg('Everything saved on this device was cleared.', 'ok');
  }

  /* ---------------- boot ---------------- */
  function fullRender() {
    syncBound(); $('#showAll').checked = !!S.showAll; labelGrades(); renderTabs(); renderTransfers(); renderCoc(); $$('#grades select').forEach(s => { delete s.dataset.sig; }); update(false);
  }
  function init() {
    loadStore(); initBindings(); buildGrades(); renderHelp(); renderRef();
    const fp = document.querySelector('.foot p'); if (fp) fp.appendChild(h('span', { class: 'build', text: ' Build ' + BUILD + '.' }));
    $('#addTransfer').addEventListener('click', () => { P().prior.transfers.push({ title: '', equiv: '', area: 'elec', cr: 1, when: '9', lang: 'fr' }); renderTransfers(); update(true); });
    $('#addCoc').addEventListener('click', () => { P().cocurr.push({ name: '', status: 'active' }); renderCoc(); });
    $('#showAll').addEventListener('change', e => { S.showAll = e.target.checked; $$('#grades select').forEach(s => { delete s.dataset.sig; }); update(false); });
    $('#copyBtn').addEventListener('click', copyPlan); $('#clearPlan').addEventListener('click', clearPlan);
    $('#saveAll').addEventListener('click', saveAll); $('#saveOne').addEventListener('click', saveOne); $('#printBtn').addEventListener('click', printPlan);
    $('#openFile').addEventListener('change', e => { if (e.target.files[0]) openFile(e.target.files[0]); e.target.value = ''; }); $('#wipeAll').addEventListener('click', wipeAll);
    fullRender(); initNav(); showSync();
  }
  WA.app = { BUILD, syncProblems, showSync, getState: () => S, setState: s => { S = s; fullRender(); }, update, view, printData, switchPlan, stats, talkData };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
