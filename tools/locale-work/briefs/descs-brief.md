# Descriptions brief — translate the Chinese rule texts of "Stronghold Protocol: Alliance" into English

Repo `<repo>` (English fork of a Chinese Arknights auto-chess web game). The game data
(`data/*.json`) is Chinese; an English overlay table per data file (`public/locales/en/<file>.json`, keyed by the exact
Chinese text) supplies the English. You translate DESCRIPTIONS: skill / talent / trait texts of mode-specific operators,
alliance (盟约) effects, strategy effects, gear effects and flavor text, Draft card texts (bounties, tactical decisions),
enemy and boss abilities, garrison (operator "special effect") rules, tips, mode descriptions … These texts are what players
READ to learn a rule, so they must be exactly faithful to the mechanic AND read like the official Arknights Global text.
You do NOT edit the repo: you write a JSON file (below). Do not run git commands that change anything.

## Inputs
- Your batch file(s) (paths in your assignment): `{ task, domain, entries: [ { zh, files, fields, where, refs } ] }`.
  `zh` = the text to translate, with its rich-text markup; `where` = up to 3 places it occurs (`file:record.field`, the
  record's Chinese `name` and context); `refs` = English for names that occur inside the text — **already decided**
  (official operator / enemy / skill / status-term names, and the names of strategies, alliances, gear, cards that were
  translated before you): use them VERBATIM, brackets and all (`【重点监护】` → `[Intensive Care]`).
- `docs/GLOSSARY.md` (READ FIRST: fixed terms and the style rules) and `docs/PLAYING.md` (the full English player guide:
  how every mechanic is called — read the sections for your domain).
- THE OFFICIAL STYLE, BY EXAMPLE: `public/locales/en/chess.json` and `enemies.json` hold ~2,300 official Arknights Global
  texts (operator skills / talents / traits, enemy abilities) next to their Chinese source. Before you write a phrase,
  `grep` that table for the Chinese phrase and imitate the official English: `攻击速度`→`ASPD`, `攻击力`→`ATK`, `防御力`→`DEF`,
  `生命上限`→`Max HP`, `法术抗性`→`RES`, `阻挡数`→`Block`, `再部署时间`→`Redeploy Time`, `技力`→`SP`, `部署费用`→`DP cost`,
  `物理/法术/真实伤害`→`Physical/Arts/True damage`, `造成相当于攻击力X%的…`→`deals X% of ATK as …`, `持续X秒`→`for X seconds`,
  `优先攻击`→`prioritizes`, `范围内`→`within range`, `每隔X秒`→`every X seconds`, `至多`→`up to`, `额外`→`additionally`.
  Official status terms (`<$ba.stun>晕眩</>` → `<$ba.stun>Stun</>`) and tag usage are visible there too.
- Official dictionaries (zh → en): `<work>/official-names.json`
  { operators, enemies, skills, modules, terms }; full official tables under `<repo>/.cache/gamedata-en/excel/`.

## Rules (a checker enforces 1–4; a reviewer reads the rest)
1. **Markup, placeholders, numbers: verbatim.** Every rich-text tag of the source — `<@ba.vup>…</>`, `<$ba.stun>…</>`,
   `<@autochess.dgreen>…</>` — appears in the English with the SAME tag names and the same number of `</>` closers; only the
   words INSIDE the tags are translated; a tag may move with the words it highlights. Every `{0:0%}` / `{1}` placeholder
   survives. Every number of the source appears in the English as a digit (`三个` → `3`, `一半` → `50%` is acceptable but
   must be listed as a note; prefer the digit the source implies); never change a number, a percentage or a duration.
2. **Literal condition markers** `<战斗中>`, `<获得时>`, `<在场6名不同【炎】干员>` are plain text with angle brackets:
   keep the brackets and translate the inside (`<In Battle>`, `<On Acquisition>`, `<With 6 different [Yan] operators present>`
   — Title-case the first word, keep it short). Count must match.
3. **Line breaks** (`\n`) stay where they are (same number).
4. **No Chinese or full-width punctuation** in the English (`，` `；` `（）` `【】` `「」` → ASCII; `【X】` → `[X]`; `“X”` → `'X'`).
5. Faithful and complete: every condition, number, trigger and exception of the source is in the English, in the same
   logical order; never add or drop a rule; keep conditionals precise ("when", "after", "each time", "at most", "at least").
6. Terms exactly as in the glossary and the refs. The game's own vocabulary: *alliance* (盟约, `[Yan]`), *layers* (层数),
   *activate* (激活), *Funds* (资金), *Reserve* (整备区), *Dispatch Center* (调度中心), *Rest Phase* (休整期), *Draft* (机变),
   *Unite Phase* (联防), *Elite* (精锐, a promoted operator) vs *Elite* enemy rank, *tier I–VI* (阶), *deploy* (部署), *retreat*.
7. Style: concise official-game prose (present tense, "Deals…", "Restores…", "Increases…", "While … , …"), no filler,
   no commentary, sentence case, no trailing period if the source has none (match the source's habit; official English
   usually has none inside skill lists and a period after full sentences — follow the source). Flavor text (`flavor`) is
   narrative: translate it as literary, in-universe prose, keeping its line breaks and quote marks as `"…"`.
8. If a source is a dev note with Chinese names embedded (e.g. `(见 bonds.json yanShip)`), translate the sentence and keep the file reference as is.

## Output
Write `<work>/out/<your-assignment-name>.json` containing ONE JSON object
`{ "<zh>": "<en>", … }` with an entry for EVERY `zh` of your batches (valid JSON, UTF-8, keys copied EXACTLY from the batch,
including `\n`). Then run the checker on your own output and fix what it reports until it is clean:
`node tools/locale-work/check-batch.mjs <your output file>`.
Finish with a short report (≤ 200 words): how many texts, the ones you are unsure about (`zh → why`), mechanics you could not
fully understand from the text, and any glossary-worthy decisions.
