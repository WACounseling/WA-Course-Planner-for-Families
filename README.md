# Woodward Academy — Course Planner for Students & Families

A free, anonymous practice planner. Families build up to **three** different four-year plans before the PATH meeting with their school counselor.
It is a plain static website (GitHub Pages): **no sign-in, no server, no Google account, nothing is sent anywhere.**

## What families can do
- Pick a projected graduation year (the only thing the site asks about the student) and build **Plan A / B / C** — rename them, copy one to another, compare them in an **At a glance** table.
- Dropdowns follow the 2026–2027 Scheduling & Curriculum Guide. Courses stay **locked until prerequisites are met**; a **Show all courses** toggle lists everything with ⚠ warnings so families can explore what a path would take.
- Enter Middle School credit/placement and transfer credit; add cocurriculars (participating / interested).
- A live **credit tracker** (green / gold / coral), the celebration animation, a sidebar for navigation, and a **Things to Discuss** list (open requirements, ⚑ approvals, prerequisite and course-load heads-ups).
- Built-in **how-to, glossary (CP/EP/HP/AP)** and **questions to ask at the PATH meeting**.
- **Save, print & share:**
  - *Download all my plans* — one file with all three plans, to reopen later (**Open a file…**).
  - *Download this plan for my counselor* — a one-plan file the counselor can import into the Counselor Planner.
  - *Print / Save as PDF* — a clean printout (plan, optional reference page, optional questions page).
- Plans are remembered in the browser on that device (localStorage). A **Clear everything** button removes them. Notes are free text — a reminder tells families not to type personal details.

## Publish it (own repository and web address)
1. On GitHub create a **new public repository** (for example `course-planner-families`). Upload everything in this folder except `test/` (optional).
2. Settings → Pages → Deploy from branch → `main` / root. The site is at `https://YOUR-USERNAME.github.io/course-planner-families/`.
3. Nothing else to configure — there is no Google setup and no `config.js`.
4. Open the site, build a test plan, and check the footer shows a build number and there is no red notice at the top. If a red notice names a file, upload the latest copy of that file (all files must come from the same release), wait a minute, and hard-refresh (Ctrl+Shift+R).

## Privacy summary (for your technology director)
- No accounts, cookies set by the site, analytics, or third-party scripts. The page makes no requests to any server except loading its own files and the **Montserrat font from Google Fonts** (which can reveal a visitor's IP address to Google; to avoid it, self-host the font files and remove the `fonts.googleapis.com` links in `index.html`).
- Plans live only in the visitor's browser storage and in files the visitor downloads. GitHub Pages serves the files and does not receive plan data.
- Files are anonymous by design (no name or email fields). Free-text notes are the only place personal details could be typed.

## Counselor import
The **Counselor Planner** (separate site) has an **Import a student's plan file…** button in Step 1. It reads the single-plan file (or lets the counselor choose among the three in an "all plans" file), fills in courses, prior credit, cocurriculars and graduation year, and appends the family's notes. The counselor then adds the student's name and email. Imported data is re-validated: unknown courses and malformed values are dropped.

## Yearly updates
`catalog.js` (courses/prerequisites), `cocurriculars.js`, and `reference.js` (graduation, HOPE/Zell, NCAA) are **shared** with the Counselor Planner — update them in both repositories. `engine.js` here is a superset of the counselor copy (adds show-all / warn-only modes). Family wording (how-to, glossary, questions, disclaimer) is in `family.js`. Bump `?v=` in `index.html` when you publish a release so browsers fetch new files.

## Tests (optional)
`npm i jsdom`, then `node test/engine.test.js`, `engine2.test.js`, `planio.test.js`, `family.test.js`, `nav.test.js`.

## Notes
- Print uses the browser's print dialog (choose *Save as PDF*). Page 1 is built to fit one page; very long lists in "Things to Discuss" are shortened on the printout (the full list stays on screen).
- Interpretations to confirm with your Academic Dean are listed in the Counselor Planner README.
