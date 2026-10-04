# UI wording review brief — "Stronghold Protocol: Alliance" English localization

Repo `<repo>`. The player-visible Chinese text of the browser client was just translated into
English by several translators working in parallel. You are the REVIEWER: you look for wording that a native English
speaker who plays Arknights Global would find wrong, stiff, inconsistent or misleading — and you propose exact fixes.
You are READ-ONLY: do not edit any file in the repo, do not run git commands that change anything.

## Read first
1. `docs/GLOSSARY.md` — the fixed terms and style rules (Title Case for labels/buttons, sentence case for sentences, units,
   quotes, "Doctor", "Operator", "Funds", "Rest Phase", "Unite Phase", "Draft", "Reserve", "Dispatch Center" …).
2. `docs/PLAYING.md` — the English player guide: it shows how every mechanic and UI element is named.
3. Official Arknights Global wording for combat terms is in `public/locales/en/chess.json` (official English operator skill
   text next to the Chinese): look there for how Global phrases stats and statuses (ATK, DEF, Max HP, ASPD, Redeploy Time, SP …).

## What to review
The diff of the translation (added lines are the English): run the command in your assignment (a `git diff` against the
commit before the translation, restricted to your files). Review ONLY the English text a player can see: string literals,
template text, `aria-label` / `title` / `placeholder` values, CSS `content:` text. Ignore code, comments and test files.
To judge a string you may need its context: open the file around the line.

Check, in this order of importance:
1. **Wrong or misleading meaning** (compare with the removed Chinese line in the diff, and with PLAYING.md).
2. **Inconsistent terms**: the same concept named two ways (within your files, or against the glossary / PLAYING.md /
   shared strings: "Not enough Funds", "Reserve is full", "Sold", "Dispatch Center is at max level", "Invalid target",
   "Disabled" vs "(disabled this match)", "Go Watch", "Back to Battlefield" …).
3. **Unnatural English / calques / machine-translation feel**; wrong grammar, plural ("1 operators"), capitalization
   (Title Case for buttons/labels/headings; sentence case for sentences/tooltips/toasts), missing/extra period,
   double spaces, mixed quote styles (one style per file: straight ' or curly “ ” — flag mixes).
4. **Fit**: very long text in narrow places (chips, buttons, tabs, badges, shop cards ~1.3 rem wide labels): suggest a
   shorter wording where a label exceeds ~16 characters in a chip/button/tab.
5. Arknights voice: "Operators", "Doctor", "Deploy", "Retreat", "Redeploy", "Dispatch", official status words.

Do NOT nitpick style preferences that are fine as they are; every suggestion must fix a real problem. Do not suggest changes
to identifiers, CSS classes, data keys or code.

## Output
Write a JSON array to the output file named in your assignment:
`[ { "file": "public/js/ui/x.js", "old": "<EXACT text as it appears in the file now>", "new": "<replacement>", "why": "<short>" }, … ]`
- `old` must be copied exactly from the current file (it is applied with a plain string replace) and must be unique in the
  file — include enough surrounding text, but change only the words that need changing. Keep markup/`${…}` untouched.
- If the same fix applies to several places in several files, list each place.
Then finish with a short report (≤ 150 words): how many suggestions, the main recurring problems, and any glossary decision
the lead should make. If you find nothing wrong in a file, say so — an empty list is fine.
