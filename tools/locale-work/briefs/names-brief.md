# Names brief — translate the Chinese NAMES of "Stronghold Protocol: Alliance" into English

Repo `<repo>` (English fork of a Chinese Arknights auto-chess web game). The game data
(`data/*.json`) is Chinese; an English overlay table per data file (`public/locales/en/<file>.json`, keyed by the exact
Chinese text) supplies the English. You translate NAMES: short display strings (strategy / squad-leader names, alliance
names, item names, bounty and tactic card titles, enemy / boss / summon names, stage and device names, emote labels…).
You do NOT edit the repo: you write a JSON file (below). Do not run git commands that change anything.

## Inputs
- Your batch file(s) (paths in your assignment): `{ task, domain, entries: [ { zh, files, fields, where, refs } ] }`.
  `where` = up to 3 places the text occurs: `file:record.field`, with the record's `name` and a Chinese `desc` of the
  effect so you know what the thing is; `refs` = OFFICIAL Arknights Global English for names embedded in the text
  (operators, enemies, skills, modules, status terms; use them verbatim for those parts).
- `docs/GLOSSARY.md` — READ FIRST: fixed terms (Alliance, Unite Phase, Draft, Reserve, Funds, Dispatch Center …) and the
  style rules. `docs/PLAYING.md` + `README.md` — already-English player docs that name many strategies, items and
  alliances (Warfarin, Cantabile, Duck Lord, Knight's Piggy Bank, Targeted Delivery, Share for All, Conscription,
  Polymorphic Isomer, Mutant Cells, Alliance Coin, Vice Hammer (Tremor / Sturdy / Accelerate / Burn), Pager Module,
  Foresight / Miracle / Investor / Raid / Unyielding / Harmony / Garrison Operator / Lone / Mastery …): grep them for the
  concept before inventing a name.
- Official dictionaries (zh → en): `<work>/official-names.json`
  = { operators, enemies, skills, modules, terms }. Full official English game tables for deeper lookups (find by the Chinese
  name in the zh file, same id in the en file): `<repo>/.cache/gamedata-en/excel/{character,skill,uniequip,enemy_handbook}_table.json`
  (en_US) and `<repo>/.cache/gamedata/excel/` (zh_CN). The earlier season's English
  (`en-cache/excel/activity_table.json` → `activity.AUTOCHESS_VERIFY1.act1vautochess`: bands, forces, traps, effects) shows
  how the official English names things in this very mode ("Strategy", "Funds", "Supply Level", "Operators", "Entry Protocol").
- Names already translated in the tables: `<repo>/public/locales/en/*.json`.

## Rules
1. **Official first.** A name that is an operator, enemy, skill, module or status term → its official Global English
   (dictionary / tables). A strategy (band) `name` is its squad leader's operator name → the operator's official English name
   (find it by `charId` in the band record, or by the zh name); its `effectName` is the strategy's title → translate it.
2. New names: short, Title Case, in the voice of Arknights (evocative, concrete, not a calque, no pinyin unless the original
   is a proper noun without official English — then standard pinyin in Western order, no tone marks).
3. Keep structure: `A·B` stays `A · B` (spaces around the middle dot); `“X”` inside a name → `'X'` (the official English
   style: single quotes); `【X】` → `[X]`. No trailing period. No Chinese left, no pinyin tone marks, ASCII punctuation.
4. Consistency: the same Chinese → the same English everywhere; related names form one scheme (the four 维式重锤 variants
   are Tremor / Sturdy / Accelerate / Burn Vice Hammers; the bounty names `X·悬赏` / `X·多轮悬赏` / `X·战术特训` share one
   pattern: e.g. `Arts Master A2 · Bounty`, `Arts Master A2 · Multi-round Bounty`, `Arts Master A2 · Tactical Training`
   — choose the pattern once, apply it to all). `悬赏` = Bounty, `特训` = Special Training, `多轮` = multi-round,
   `战术` = Tactical, `机密商店` = Secret Shop, `战术决策` = Tactical Decision (docs/PLAYING.md).
5. If the same name could be read two ways, decide from the `where` descriptions (what the thing does); never guess blindly.

## Output
Write `<work>/out/<your-assignment-name>.json` containing ONE JSON
object `{ "<zh>": "<en>", … }` with an entry for EVERY `zh` of your batches (valid JSON, UTF-8, no comments). Then finish with a
short report (≤ 200 words): how many names, which ones you are unsure about (list `zh → en (why)`), and any
new glossary-worthy term decisions. A native English speaker who plays Arknights Global will review your names.
