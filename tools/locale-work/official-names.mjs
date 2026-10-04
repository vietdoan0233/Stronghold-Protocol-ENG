// zh → en official names for operators, enemies, skills, modules and status terms: the Chinese client data (.cache/gamedata, from
// tools/build-data.mjs) paired by id with the official Global (en_US) tables (.cache/gamedata-en, from `tools/locale.mjs harvest`).
// The status-term dictionary (gamedata_const.json) is downloaded next to them when it is missing.
// usage: node tools/locale-work/official-names.mjs [out.json]   (default <work>/official-names.json)
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, WORK } from './paths.mjs';

const ZH = path.join(ROOT, '.cache', 'gamedata');
const EN = path.join(ROOT, '.cache', 'gamedata-en');
const ZH_URL = 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/';
const EN_URL = 'https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData_YoStar/main/en_US/gamedata/';
const outFile = process.argv[2] || path.join(WORK, 'official-names.json');

async function need(dir, url, rel) {
  const dest = path.join(dir, rel);
  if (fs.existsSync(dest)) return dest;
  console.log(`download ${url}${rel}`);
  const res = await fetch(url + rel, { signal: AbortSignal.timeout(180_000) });
  if (!res.ok) throw new Error(`${url}${rel}: HTTP ${res.status} (run node tools/build-data.mjs / node tools/locale.mjs harvest first for the tables they cache)`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, await res.text());
  return dest;
}
const j = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const out = { operators: {}, enemies: {}, skills: {}, modules: {}, terms: {} };
const zc = j(await need(ZH, ZH_URL, 'excel/character_table.json')); const ec = j(await need(EN, EN_URL, 'excel/character_table.json'));
for (const [id, z] of Object.entries(zc)) { const e = ec[id]; if (e && /^char_/.test(id) && z.name && e.name) out.operators[z.name] = e.name; }
const zh = j(await need(ZH, ZH_URL, 'excel/enemy_handbook_table.json')).enemyData; const eh = j(await need(EN, EN_URL, 'excel/enemy_handbook_table.json')).enemyData;
for (const [id, z] of Object.entries(zh)) { const e = eh[id]; if (e && z.name && e.name) out.enemies[z.name] = e.name; }
const zs = j(await need(ZH, ZH_URL, 'excel/skill_table.json')); const es = j(await need(EN, EN_URL, 'excel/skill_table.json'));
for (const [id, z] of Object.entries(zs)) { const e = es[id]; const zn = z.levels?.[0]?.name; const en = e?.levels?.[0]?.name; if (zn && en) out.skills[zn] = en; }
const zu = j(await need(ZH, ZH_URL, 'excel/uniequip_table.json')).equipDict; const eu = j(await need(EN, EN_URL, 'excel/uniequip_table.json')).equipDict;
for (const [id, z] of Object.entries(zu)) { const e = eu[id]; if (e && z.uniEquipName && e.uniEquipName) out.modules[z.uniEquipName] = e.uniEquipName; }
const zk = j(await need(ZH, ZH_URL, 'excel/gamedata_const.json')).termDescriptionDict; const ek = j(await need(EN, EN_URL, 'excel/gamedata_const.json')).termDescriptionDict;
for (const [id, z] of Object.entries(zk)) { const e = ek[id]; if (e) out.terms[z.termName] = e.termName; }
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(out));
console.log(Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Object.keys(v).length])), '→', path.relative(ROOT, outFile));
