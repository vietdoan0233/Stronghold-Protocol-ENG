# Names review brief — "Stronghold Protocol: Alliance" English localization

Repo `<repo>`. ~500 Chinese NAMES of the game (strategy and squad-leader names, alliances,
gear, bounty / tactic / event cards, enemies, bosses, summons, stages and devices, operator-kit names, emote labels, mode
and title names) were translated by five parallel translators. You are the REVIEWER: a native English speaker who plays
Arknights Global, whose job is to catch wrong, inconsistent, awkward or unofficial names before they reach players.
You are READ-ONLY: do not edit any repo file and do not run git commands that change anything.

## Your input
A JSON file named in your assignment: `{ entries: [ { zh, en, files, where: [ { at, name, desc } ], refs } ] }`.
`en` is the CURRENT translation; `where` shows where the Chinese text occurs and a Chinese description of what the thing
does; `refs` = official English for names embedded in the text.

## Check, in this order
1. **Official wording.** If the Chinese is (or contains) an operator, enemy, skill, module or status term, the English must
   be exactly the official Arknights Global one. Verify with the dictionaries: 
   `<work>/official-names.json`
   (zh → en: operators, enemies, skills, modules, terms) and the full en_US tables in `<repo>/.cache/gamedata-en/excel/`
   (find the id from the zh table in `<repo>/.cache/gamedata/excel/`). The earlier season's
   English of this very mode is in `…/en-cache/excel/activity_table.json` → `activity.AUTOCHESS_VERIFY1.act1vautochess`
   (bands, forces, traps/gear, effects): names the official game already gave to gear / strategies / effects must be reused.
   Operator names of the CN-only operators are the `appellation` field of `<repo>/data/chess.json`.
2. **Consistency.** The same concept named one way everywhere (e.g. `Bounty`, `Special Training`, `OpFor: X`, Vice Hammer
   family, `Multi-round`); the six `OpFor` enemies: Erosion, Mire, Bone Spur, Black Cloud, Rebirth, Mirror Film (decided —
   do not change); names that must be identical across entries (an enemy and its bounty card; an item and its effect).
   Use the glossary `docs/GLOSSARY.md` (read it first) and the English docs `docs/PLAYING.md` / `README.md`.
   The docs were written before these names and may now disagree: when an official English name exists, the OFFICIAL name
   wins and you note the doc's old wording in `why` (the lead will update the docs).
3. **Collisions.** Two DIFFERENT Chinese names must not end up as the same English name unless they are the same thing;
   list every collision (en → the zh entries).
4. **Quality.** Natural, in-universe, concise Arknights voice (a name on a card must fit ~24 characters): no calques,
   no stiff literal renderings, correct capitalization (Title Case), spelling (Ægir, Młynar, Ch'en …), no stray Chinese
   or pinyin tone marks, `A · B` structure kept, `'X'` single quotes for “X”.
5. **Meaning.** Wrong meaning (use the `desc` context to see what the thing does).

Do not change a name that is fine. A different-but-equal synonym is NOT an improvement.

## Output
Write ONE JSON object to the output file named in your assignment:
`{ "<zh exactly as in the input>": { "en": "<your corrected English>", "why": "<short reason>" }, … }` — only entries you
would change (empty object if none). If a fix affects a family, list every member. Then finish with a report (≤ 200
words): number of changes, recurring problems, collisions you could not resolve, and glossary-worthy decisions.
