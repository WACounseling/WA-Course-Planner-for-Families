/* Builds the print-only layout (Print / Save as PDF). Page 1 plan, page 2 reference, page 3 questions. */
(function (root) {
  const WA = root.WA = root.WA || {};
  (WA.versions = WA.versions || {})['printview.js'] = '4';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fmt = n => String(Math.round(Number(n) * 100) / 100);
  const ord = g => ({ 9: '9th', 10: '10th', 11: '11th', 12: '12th' }[g] || String(g));

  function courseLine(line) {
    const m = String(line).match(/^(Fall|Spring): /); let rest = String(line), pre = '';
    if (m) { pre = '<span class="pv-sem">' + m[1] + ':</span> '; rest = rest.slice(m[0].length); }
    const lv = rest.match(/ \((CP|EP|HP|AP|EP\/HP)\)$/); const name = lv ? rest.slice(0, rest.length - lv[0].length) : rest;
    return '<div class="pv-c">' + pre + '<b>' + esc(name) + '</b>' + (lv ? esc(lv[0]) : '') + '</div>';
  }
  const list = (arr, empty, max) => {
    if (!arr.length) return '<div class="pv-none">' + esc(empty || '—') + '</div>';
    const shown = max && arr.length > max ? arr.slice(0, max) : arr;
    const cut = x => (String(x).length > 88 ? String(x).slice(0, 86).trim() + '…' : String(x));
    return '<ul>' + shown.map(x => '<li>' + esc(cut(x)) + '</li>').join('') + (shown.length < arr.length ? '<li><i>…and ' + (arr.length - shown.length) + ' more (see “Things to Discuss” in the planner)</i></li>' : '') + '</ul>';
  };

  function build(d) {
    const o = [];
    o.push('<div class="pv-page">');
    o.push('<div class="pv-head"><img src="assets/img/wordmark-red.png" alt="Woodward Academy" class="pv-logo"><div class="pv-title"><div class="pv-h1">FOUR-YEAR COURSE PLAN</div><div class="pv-sub">Practice plan · ' + esc(d.planName) + (d.classOf ? ' · Projected graduation: Spring ' + esc(d.classOf) : '') + ' · Printed ' + esc(d.printedOn) + '</div></div></div><div class="pv-rule"></div>');
    // grid
    o.push('<table class="pv-grid"><thead><tr><th class="pv-lab"></th>' + d.grades.map(g => '<th>' + esc(g.label.toUpperCase()) + (g.year ? '<small>' + esc(g.year) + '</small>' : '') + '</th>').join('') + '</tr></thead><tbody>');
    d.grades[0].rows.forEach((r, i) => {
      o.push('<tr><td class="pv-lab ' + (r.kind === 'core' ? 'core' : 'elec') + '">' + esc(r.label) + '</td>' + d.grades.map(g => { const c = g.rows[i].cells; return '<td>' + (c.length ? c.map(courseLine).join('') : '<span class="pv-none">—</span>') + '</td>'; }).join('') + '</tr>');
    });
    o.push('<tr><td class="pv-lab elec">Summer</td>' + d.grades.map(g => '<td>' + (g.summer.length ? g.summer.map(courseLine).join('') : '<span class="pv-none">—</span>') + '</td>').join('') + '</tr></tbody></table>');
    // tracker
    o.push('<div class="pv-sec">GRADUATION REQUIREMENT TRACKER</div><div class="pv-track">' + d.areas.map(a =>
      '<div class="pv-area ' + a.status + '"><div class="pv-an">' + esc(a.label.toUpperCase()) + '</div><div class="pv-av">' + fmt(a.have) + ' / ' + fmt(a.req) + ' units</div><div class="pv-as">' + (a.status === 'done' ? '✓ Complete' : a.status === 'part' ? '◐ In progress' : '○ Not started') + '</div></div>').join('') + '</div>');
    o.push('<div class="pv-small">Credits by end of year (GHSA checkpoints): ' + esc(d.ghsa) + '<br>HOPE / Zell Miller rigor courses planned: ' + d.rigor + ' (4 needed) · NCAA Division I core credits planned: ' + fmt(d.ncaa) + ' (16 needed)</div>');
    // cocurriculars
    o.push('<div class="pv-sec">COCURRICULAR ACTIVITIES</div><div class="pv-two"><div><div class="pv-sh">CURRENTLY PARTICIPATING</div>' + list(d.cocurr.active) + '</div><div><div class="pv-sh">INTERESTED IN EXPLORING</div>' + list(d.cocurr.interest) + '</div></div>');
    if (d.prior.length) o.push('<div class="pv-note"><b>Prior credit &amp; placement:</b> ' + esc(d.prior.join('  ·  ')) + '</div>');
    // talk
    const t = d.talk;
    o.push('<div class="pv-sec">THINGS TO DISCUSS WITH MY COUNSELOR</div><div class="pv-two">' +
      '<div><div class="pv-sh">REQUIREMENTS STILL OPEN</div>' + list(t.reqs, 'None — all requirements are planned', 5) + '<div class="pv-sh">APPROVALS (⚑)</div>' + list(t.approvals, 'None flagged', 3) + '</div>' +
      '<div><div class="pv-sh">PREREQUISITE &amp; GRADE-LEVEL HEADS-UPS</div>' + list(t.prereq, 'None flagged', 3) + '<div class="pv-sh">COURSE-LOAD NOTES</div>' + list(t.load, 'None flagged', 4) + '</div></div>');
    if (d.notes) o.push('<div class="pv-note"><b>My notes:</b> ' + esc(d.notes) + '</div>');
    o.push('<div class="pv-disc"><div class="pv-sec">' + esc(d.disclaimer.title.toUpperCase()) + '</div><div class="pv-small pv-dtext">' + esc(d.disclaimer.text) + '</div></div>');
    o.push('</div>');
    // page 2: college & career interests (always), then the graduation distinctions chosen (2 x 2 grid with clear space between them)
    {
      const it = d.interests || {}, dists = d.distinctions || [];
      const qa = (q, a) => '<div class="pv-qa"><div class="pv-sh">' + esc(q) + '</div>' + (a ? '<div class="pv-ans">' + esc(a) + '</div>' : '<div class="pv-lines"></div><div class="pv-lines"></div>') + '</div>';
      o.push('<div class="pv-page pv-break"><div class="pv-h2">COLLEGE &amp; CAREER INTERESTS</div><div class="pv-sub">' + esc(d.planName) + (d.classOf ? ' · Projected graduation: Spring ' + esc(d.classOf) : '') + '</div><div class="pv-rule thin"></div>');
      o.push(qa('COLLEGES OR UNIVERSITIES I AM INTERESTED IN', it.colleges) + qa('MAJOR OR PATH OF STUDY I HAVE IN MIND', it.major));
      if (dists.length) {
        o.push('<div class="pv-h2" style="margin-top:14pt">GRADUATION DISTINCTIONS</div><div class="pv-sub">Courses are projected from the plan; tick each box when the requirement has actually been completed.</div><div class="pv-rule thin"></div><div class="pv-dgrid">');
        dists.forEach(x => {
          o.push('<div class="pv-dist"><div class="pv-sec">DISTINCTION IN ' + esc(x.name.toUpperCase()) + '</div><div class="pv-small">Monitored by the ' + esc(x.coordinator) + '.  ' + esc(x.apply) + '</div>');
          o.push('<div class="pv-dline"><b>Course requirements:</b>  ' + esc(x.statusText) + '</div>');
          x.groups.forEach(g => o.push('<div class="pv-dline' + (g.met ? ' met' : '') + '">' + esc(g.text) + '</div>'));
          o.push('<div class="pv-sh">ADDITIONAL REQUIREMENTS — CHECK EACH BOX WHEN COMPLETED</div>' + x.checks.map(c => '<div class="pv-dchk">' + esc(c) + '</div>').join('') + '<div class="pv-dchk pv-dall">☐ Completed — Distinction in ' + esc(x.name) + '</div></div>');
        });
        o.push('</div>');
      }
      o.push('</div>');
    }
    if (d.opts.reference) {
      o.push('<div class="pv-page pv-break"><div class="pv-h2">GRADUATION, SCHOLARSHIP &amp; ELIGIBILITY REFERENCE</div><div class="pv-sub">Woodward Academy requirements, State of Georgia requirements, HOPE &amp; Zell Miller, NCAA · current as of ' + esc(d.reference.updated) + '</div><div class="pv-rule thin"></div><div class="pv-refcols">');
      d.reference.sections.forEach(s => {
        o.push('<div class="pv-refsec"><div class="pv-sh red">' + esc(s.title.toUpperCase()) + '</div>' + (s.rows || []).map(r => '<div class="pv-row"><b>' + esc(r[0]) + ':</b> ' + esc(r[1]) + '</div>').join('') + ((s.items || []).length ? '<ul>' + s.items.map(i => '<li>' + esc(i) + '</li>').join('') + '</ul>' : '') + '</div>');
      });
      o.push('</div></div>');
    }
    if (d.opts.questions) {
      o.push('<div class="pv-page pv-break"><div class="pv-h2">QUESTIONS TO ASK AT MY PATH MEETING</div><div class="pv-rule thin"></div><ol class="pv-q">' + d.questions.map(q => '<li>' + esc(q) + '</li>').join('') + '</ol><div class="pv-sh">MY OWN QUESTIONS</div>' + '<div class="pv-lines"></div><div class="pv-lines"></div><div class="pv-lines"></div><div class="pv-lines"></div></div>');
    }
    return o.join('');
  }
  WA.printview = { build };
  if (typeof module !== 'undefined') module.exports = WA.printview;
})(typeof globalThis !== 'undefined' ? globalThis : this);
