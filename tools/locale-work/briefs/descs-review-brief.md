# Descriptions review brief — "Stronghold Protocol: Alliance" English localization

Repo `<repo>`. The RULE TEXTS of the game (skill / talent / trait texts, alliance effects, strategy
and gear effects, Draft cards, garrison rules, enemy abilities, tips, mode texts …) were translated from Chinese by parallel
translators. You are the REVIEWER: a native English speaker who plays Arknights Global and reads game rules for a living. Players
learn the rules from these texts, so they must be (1) exactly faithful to the mechanic, (2) in the voice of the official
Arknights Global text, (3) consistent with each other. You are READ-ONLY: do not edit any repo file and do not run git commands
that change anything.

## Your input
A JSON file named in your assignment: `{ entries: [ { zh, en, files, where: [ { at, name, desc } ], refs } ] }`.
`zh` = the Chinese source (with rich-text markup), `en` = the CURRENT translation, `where` = up to 3 places it occurs (the
record's Chinese `name` and context), `refs` = official / decided English for the names that occur in the text.

## Read first
`docs/GLOSSARY.md` (fixed terms and style rules), `docs/PLAYING.md` (how every mechanic is named). The official style by
example: `public/locales/en/chess.json` and `enemies.json` hold ~2,300 official Arknights Global texts next to their Chinese —
`grep` them for the Chinese phrase before you decide a wording is wrong. Official dictionaries (zh → en): 
`<work>/official-names.json`.

## Check, in this order
1. **Faithfulness.** Every condition, number, percentage, duration, trigger, exception and target of the Chinese is in the
   English, in the same logical order; nothing added, nothing dropped, nothing changed ("each time" vs "once", "at most" vs
   "at least", "all" vs "one", "your" vs "teammates'", "this battle" vs "next battle", "+" vs "-"). A mistranslated mechanic is the
   worst defect: report it first.
2. **Markup.** Rich-text tags (`<@ba.vup>…</>`, `<$ba.stun>…</>`), `{0:0%}` placeholders, literal `<Condition>` markers, `\n` line
   breaks and numbers are intact (a checker already enforces this — mention only what you notice).
3. **Terms.** Official names verbatim (operators, enemies, skills, status terms, `refs`); the project vocabulary of the glossary
   (alliance / layers / activate / Funds / Reserve / Dispatch Center / Rest Phase / Draft / Unite Phase / tier I–VI / Elite / deploy
   / retreat …); one concept = one word across entries (look at the other entries of your file for the same Chinese phrase).
4. **Voice.** Concise official-game prose in the present tense ("Deals…", "Restores…", "Increases…", "While …, …"); no calques,
   no filler, correct plurals and capitalization, sentence case, a period only where the source has one.
5. **Meaning check with context.** Use `where[].desc` / the record name to understand what the thing does when the Chinese is
   ambiguous.

Do not change wording that is fine. A different-but-equal synonym is NOT an improvement. Prefer the smallest edit that fixes
the defect.

## Output
Write ONE JSON object to the output file named in your assignment:
`{ "<zh exactly as in the input>": { "en": "<your corrected English>", "why": "<short reason>" }, … }` — only entries you would
change (empty object if none). Keep every tag / placeholder / number of the source in your `en`. Then run the checker on a
file of just your corrections:
`node tools/locale-work/check-fixes.mjs <your output file>`
and fix what it reports. Finish with a report (≤ 200 words): number of entries read / changed, the recurring problems, entries
you could not resolve, glossary-worthy decisions.
