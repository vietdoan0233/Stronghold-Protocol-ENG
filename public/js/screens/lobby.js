// Lobby screen: pick 独立模拟 / 同盟模拟 and a difficulty (标准/险境/绝境/终极), create a room,
// or join one with a 同盟密钥 (recent codes remembered) — as a player (加入同盟) or in one of its MAX_SPECTATORS
// spectator seats (观战: room.spectate, also while its match runs; community report #26, a remake feature — the
// official room has none). Shows connection status + ping.
//
// Difficulty descriptions come from data/config.json `modes[modeId]` when present, else from the
// official act2autochess `modeDataDict` texts embedded below (desc + effectDescList), so the
// screen is complete before data is generated. Rounds: solo 标准 = 9, everything else 14 (+R15
// hidden core on 险境+), per research 00-INDEX §2. Battlefield pool (`modes[].stages`): 标准 always
// plays 战场#01, 险境 draws one of 8, 绝境 / 终极 one of 7 (m01 excluded).

import { useEffect, useRef, useState } from '../../vendor/hooks.module.js';
import { DIFFICULTIES, DIFFICULTY_NAMES, DIFFICULTY_COLORS, ROOM_CODE_LEN, MAX_SEATS, MAX_SPECTATORS, modeIdFor } from '../../../shared/constants.js';
import { html, Button, Icon, MicroLabel, Panel, TextField, PingPill, AvatarFrame, Tooltip, Spinner, DifficultyIcon, doctorNo } from '../ui/components.js';
import { toast, toastError } from '../ui/toasts.js';
import { GuideButton } from '../ui/guide.js';
import { LoadoutButton } from './loadout.js';
import { net, identity } from '../net.js';
import { store, useStore, shallowEqual, loadPref, savePref } from '../store.js';
import { getConfig, getMode, getStage, useData } from '../data.js';

/** Official mode texts (activity_table act2autochess.modeDataDict), fallback when config.json is absent. */
export const MODE_TEXT = {
  single: {
    FUNNY: { code: 'AC-1', desc: 'A short training simulation', effects: ['Combat can be completed quickly', 'Standard rewards'] },
    NORMAL: { code: 'AC-2', desc: 'A training simulation with stronger enemy attacks', effects: ['More Alliances can be used', 'Greatly increased rewards'] },
    HARD: { code: 'AC-3', desc: 'A training simulation with extremely strong enemy attacks', effects: ['Difficult combat environment', 'More dangerous enemies appear'] },
    ABYSS: { code: 'AC-4', desc: 'A training simulation with enemy attacks at their limit', effects: ['Extremely difficult combat environment', 'Extremely dangerous enemies appear'] },
  },
  multi: {
    FUNNY: { code: 'AC-1', desc: 'A training simulation with weaker enemy attacks', effects: ['Mild combat environment', 'Standard rewards'] },
    NORMAL: { code: 'AC-2', desc: 'A training simulation with stronger enemy attacks', effects: ['More Alliances can be used', 'Greatly increased rewards'] },
    HARD: { code: 'AC-3', desc: 'A training simulation with extremely strong enemy attacks', effects: ['Difficult combat environment', 'More dangerous enemies appear'] },
    ABYSS: { code: 'AC-4', desc: 'A training simulation with enemy attacks at their limit', effects: ['Extremely difficult combat environment', 'Extremely dangerous enemies appear'] },
  },
};

/** Battlefield pool per difficulty when config.json is absent (the modes' `stages` lists; same for solo and co-op). */
export const STAGE_POOL = { FUNNY: ['act1autochess_m01'], NORMAL: 8, HARD: 7, ABYSS: 7 };

/**
 * Display name of a stage: stages.json when it is loaded, else derived from the id (act1 m0N → 战场#0N, act2 m0N → 战场#0(N+4)).
 * @param {string} id e.g. 'act1autochess_m01'
 */
export function stageLabel(id) {
  const rec = getStage(id);
  if (rec && typeof rec.name === 'string' && rec.name) {
    // 'Battlefield #05 (First Half) Rising Tide' → 'Battlefield #05'; a name of any other shape keeps its first word
    const lead = rec.name.match(/^Battlefield\s*#\d+/);
    return lead ? lead[0] : rec.name.split(/\s+/)[0];
  }
  const m = String(id || '').match(/^act(\d)autochess_m(\d+)$/);
  return m ? `Battlefield #${String(Number(m[2]) + (m[1] === '2' ? 4 : 0)).padStart(2, '0')}` : '';
}

/**
 * The battlefield note of a difficulty (official wording): a single-stage pool is fixed ("战场固定为 战场#01"), a larger
 * one is drawn at random ("战场随机（共8张）").
 * @param {string[] | number | null | undefined} stages the mode's `stages` list (or a count)
 * @returns {string} '' when unknown
 */
export function stageNote(stages) {
  if (Array.isArray(stages)) {
    const ids = stages.filter((s) => typeof s === 'string' && s);
    if (ids.length === 1) { const name = stageLabel(ids[0]); return name ? `Fixed battlefield: ${name}` : 'Fixed battlefield'; }
    return ids.length > 1 ? `Random battlefield (${ids.length} maps)` : '';
  }
  return Number.isInteger(stages) && stages > 1 ? `Random battlefield (${stages} maps)` : '';
}

const MODE_CARDS = [
  {
    id: 'solo', name: 'Solo Simulation', en: 'SOLO SIMULATION', icon: 'user',
    desc: 'Allocate Funds and Operators by yourself and complete the entire simulation at your own pace.',
    points: ['1 Doctor', 'Rest Phase and Draft Phase are untimed'],
  },
  {
    id: 'coop', name: 'Alliance Simulation', en: 'ALLIANCE SIMULATION', icon: 'users',
    desc: `Team up with up to ${MAX_SEATS - 1} other Doctors, share the Operator pool and hold off the enemy tide together in the Unite Phase.`,
    points: [`1–${MAX_SEATS} Doctors · AI teammates can fill empty seats`, 'Unite Phase · LP merged in the Final Assault'],
  },
];

/**
 * Text for a difficulty card, preferring data/config.json.
 * @param {'solo'|'coop'} roomMode
 * @param {string} difficulty
 * @returns {{ code: string, desc: string, effects: string[], rounds: number, hidden: boolean, stageNote: string }}
 */
export function difficultyInfo(roomMode, difficulty) {
  const fallback = MODE_TEXT[roomMode === 'solo' ? 'single' : 'multi'][difficulty] || { code: '', desc: '', effects: [] };
  // modeIdFor() lower-cases the difficulty: never call it with a value the server did not validate.
  const m = DIFFICULTIES.includes(difficulty) ? getMode(modeIdFor(roomMode, difficulty)) : null;
  const effects = Array.isArray(m?.effectDescList)
    ? m.effectDescList.map((e) => String(e).replace(/^[·•\s]+/, '')).filter(Boolean)
    : fallback.effects;
  const rounds = Number.isFinite(m?.lastRound) ? m.lastRound : roomMode === 'solo' && difficulty === 'FUNNY' ? 9 : 14;
  return {
    code: typeof m?.code === 'string' ? m.code : fallback.code,
    desc: typeof m?.desc === 'string' ? m.desc : fallback.desc,
    effects,
    rounds,
    hidden: difficulty !== 'FUNNY',
    stageNote: stageNote(Array.isArray(m?.stages) && m.stages.length ? m.stages : STAGE_POOL[difficulty]),
  };
}

const CODE_RE = new RegExp(`^[A-Z0-9]{${ROOM_CODE_LEN}}$`);
/**
 * Normalise user input into a room code: accepts a pasted invite link (`…?room=ABCD`), keeps
 * upper-cased alphanumerics and clamps to the code length.
 * @param {string} v
 * @returns {string}
 */
export function normalizeCode(v) {
  let s = String(v ?? '');
  const m = s.match(/[?&]room=([A-Za-z0-9]+)/);
  if (m) s = m[1];
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ROOM_CODE_LEN);
}

/**
 * A handler that Preact binds as `onClick=${fn}` receives the click EVENT as its first argument, and a default
 * parameter only applies to `undefined` — so `fn(c = code)` would normalise the event target into a nonsense code
 * (`String(el)` → `"[object HTMLElement]"` → "OBJE"). Only a string is ever a code; anything else falls back to the
 * input field. Returns null when neither yields a well-formed code.
 * @param {unknown} arg the argument a handler was called with
 * @param {string} field the current input-field value
 * @returns {string|null}
 */
export function codeArg(arg, field) {
  const k = normalizeCode(typeof arg === 'string' ? arg : field);
  return CODE_RE.test(k) ? k : null;
}

/**
 * Room code from a deep link query string (`?room=CODE`), or null when absent/malformed.
 * Accepts ROOM_CODE_LEN..ROOM_CODE_LEN+2 alphanumerics (the protocol's join limit).
 * @param {string} search e.g. location.search
 * @returns {string|null}
 */
export function parseRoomParam(search) {
  try {
    const raw = new URLSearchParams(search || '').get('room');
    if (!raw) return null;
    const code = raw.trim().toUpperCase();
    if (!/^[A-Z0-9]+$/.test(code)) return null;
    return code.length >= ROOM_CODE_LEN && code.length <= ROOM_CODE_LEN + 2 ? code : null;
  } catch {
    return null;
  }
}

/** Recently joined/created co-op room codes (most recent first). */
export function recentRooms() {
  const list = loadPref('recentRooms', []);
  return Array.isArray(list) ? list.filter((c) => typeof c === 'string' && CODE_RE.test(c)).slice(0, 4) : [];
}

/** @param {string} code */
export function rememberRoom(code) {
  if (!CODE_RE.test(code)) return;
  savePref('recentRooms', [code, ...recentRooms().filter((c) => c !== code)].slice(0, 4));
}

const FALLBACK_TIPS = [
  'In Alliance Simulation you can skip once while choosing a strategy',
  'You can still refresh the Dispatch Center manually even while it is frozen',
  'Two identical pieces of gear can be merged into a more powerful one',
  'Only teammates who achieved a Perfect Combat can take part in the Unite Phase',
];
const TIP_ROTATE_MS = 5000; // matchingTipRotateInterval

/** Rotating tactical tips (config.json `tips`, weighted list of { tip, weight }). */
function TipsPanel() {
  const cfg = getConfig();
  const tips = Array.isArray(cfg?.tips)
    ? cfg.tips.map((t) => (typeof t === 'string' ? t : t?.tip)).filter((t) => typeof t === 'string' && t)
    : FALLBACK_TIPS;
  const list = tips.length ? tips : FALLBACK_TIPS;
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * list.length));
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => i + 1), TIP_ROTATE_MS);
    return () => clearInterval(id);
  }, []);
  const i = ((idx % list.length) + list.length) % list.length;
  return html`<div class="tips brackets">
    <div class="tips__head">
      <${Icon} name="info" />
      <span>Combat Tips</span>
      <${MicroLabel}>TACTICAL TIPS<//>
      <span class="tips__idx num">${String(i + 1).padStart(2, '0')}<span class="t-dim">/${String(list.length).padStart(2, '0')}</span></span>
      <button type="button" class="tips__nav" onClick=${() => setIdx(i - 1 + list.length)} aria-label="Previous tip"><${Icon} name="chevronLeft" /></button>
      <button type="button" class="tips__nav" onClick=${() => setIdx(i + 1)} aria-label="Next tip"><${Icon} name="chevronRight" /></button>
    </div>
    <p key=${i} class="tips__text">${list[i]}</p>
  </div>`;
}

function ModeCard({ card, selected, onSelect }) {
  return html`<button type="button" class=${`mode-card brackets${selected ? ' is-selected' : ''}`} onClick=${() => onSelect(card.id)}
      aria-pressed=${selected ? 'true' : 'false'}>
    <span class="mode-card__bg" aria-hidden="true"></span>
    <span class="mode-card__icon"><${Icon} name=${card.icon} /></span>
    <span class="mode-card__text">
      <${MicroLabel} tone=${selected ? 'mint' : undefined}>${card.en}<//>
      <span class="mode-card__name">${card.name}</span>
      <span class="mode-card__desc">${card.desc}</span>
      <span class="mode-card__points">${card.points.map((p) => html`<span key=${p}>${p}</span>`)}</span>
    </span>
    <span class="mode-card__check" aria-hidden="true"><${Icon} name="check" />Selected</span>
  </button>`;
}

function DifficultyCard({ roomMode, difficulty, selected, onSelect }) {
  const info = difficultyInfo(roomMode, difficulty);
  return html`<button type="button" class=${`diff-card${selected ? ' is-selected' : ''}`}
      style=${`--d-color:${DIFFICULTY_COLORS[difficulty]}`} onClick=${() => onSelect(difficulty)} aria-pressed=${selected ? 'true' : 'false'}>
    <span class="diff-card__bar" aria-hidden="true"></span>
    <span class="diff-card__head">
      <${DifficultyIcon} difficulty=${difficulty} class="diff-card__glyph" />
      <span class="diff-card__name">${DIFFICULTY_NAMES[difficulty]}</span>
      <span class="diff-card__code num">${info.code}</span>
      <span class="diff-card__meta">
        <span class="num">${info.rounds}</span> rounds${info.hidden ? html`<span class="diff-card__hidden">+ Hidden Core</span>` : null}
      </span>
    </span>
    <span class="diff-card__desc">${info.desc}</span>
    <span class="diff-card__effects">${info.effects.map((e) => html`<span key=${e}>${e}</span>`)}${info.stageNote ? html`<span key="stage" class="diff-card__stage"><${Icon} name="rook" />${info.stageNote}</span>` : null}</span>
    <span class="diff-card__check" aria-hidden="true"><${Icon} name="check" /><span>Selected</span></span>
  </button>`;
}

/** Lobby screen component. */
export function LobbyScreen() {
  const me = useStore((s) => s.me, shallowEqual);
  const conn = useStore((s) => s.connection, shallowEqual);
  useData('config');
  const [roomMode, setRoomMode] = useState(() => (loadPref('lobby.mode', 'coop') === 'solo' ? 'solo' : 'coop'));
  const [difficulty, setDifficulty] = useState(() => {
    const d = loadPref('lobby.difficulty', 'FUNNY');
    return DIFFICULTIES.includes(d) ? d : 'FUNNY';
  });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(null);
  const [recent] = useState(recentRooms);
  const alive = useRef(true);
  const inFlight = useRef(false); // synchronous guard against double clicks (state updates are async)
  useEffect(() => () => { alive.current = false; }, []);

  const online = conn.status === 'online';
  const codeOk = CODE_RE.test(code);

  const pickMode = (m) => { setRoomMode(m); savePref('lobby.mode', m); };
  const pickDifficulty = (d) => { setDifficulty(d); savePref('lobby.difficulty', d); };

  const run = async (kind, fn) => {
    if (inFlight.current) return;
    if (!online) { toast('Not connected to the server yet. Please wait.', 'warn'); return; }
    inFlight.current = true;
    setBusy(kind);
    try { await fn(); } catch (err) { toastError(err); } finally {
      inFlight.current = false;
      if (alive.current) setBusy(null);
    }
  };
  const create = () => run('create', () => net.request('room.create', { mode: roomMode, difficulty }));
  const join = (c = code) => {
    // `onClick=${join}` hands the click event as the first argument; codeArg ignores it and falls back to the input.
    const k = codeArg(c, code);
    if (!k) { toast(`Enter a valid ${ROOM_CODE_LEN}-character alliance key or invite link.`, 'warn'); return; }
    run('join', () => net.request('room.join', { code: k }));
  };
  // a spectator seat: no player seat taken, nothing to do but watch (also a match already running)
  const spectate = (c = code) => {
    // same guard as join: `onClick=${spectate}` passes the click event, not a code
    const k = codeArg(c, code);
    if (!k) { toast(`Enter a valid ${ROOM_CODE_LEN}-character alliance key or invite link`, 'warn'); return; }
    run('spectate', () => net.request('room.spectate', { code: k }).catch((err) => {
      // Clearer than the bare ERR_TEXT: the usual cause is a code that is not the host's (a remembered one from an
      // earlier room, or another machine's) — the server can only answer "no such room".
      if (err?.code === ERR.ROOM_NOT_FOUND) {
        toast(`No alliance found for key ${k}. Check with the host; the key expires when the alliance closes.`, 'warn');
        return;
      }
      if (err?.code === ERR.ALREADY) {
        toast('You are already a player in this alliance. Leave it before joining as a spectator.', 'warn');
        return;
      }
      throw err;
    }));
  };
  const backToTitle = () => {
    identity.setEntered(false);
    store.set((s) => ({ session: { ...s.session, entered: false } }));
  };

  return html`<div class="screen lobby-screen">
    <header class="topbar">
      <div class="topbar__left">
        <${Button} variant="ghost" size="sm" icon="chevronLeft" onClick=${backToTitle} title="Back to the title screen">Back<//>
        <${PingPill} ms=${conn.ping} online=${online} />
      </div>
      <div class="topbar__center">
        <${MicroLabel} tone="mint">SIMULATION PROTOCOL SELECT<//>
        <h1 class="topbar__title">Select Simulation Protocol</h1>
      </div>
      <div class="topbar__right">
        <${GuideButton} class="lobby-guide" variant="secondary" />
        <${LoadoutButton} from="lobby" size="sm" class="lobby-loadout" />
        <div class="me-chip">
          <${AvatarFrame} size="sm" name=${me.name} seat=${0} self=${true} />
          <div class="me-chip__text">
            <span class="me-chip__name">${me.name || 'Doctor'}</span>
            <${MicroLabel}>${me.playerId != null ? `DOCTOR #${doctorNo(me.playerId)}` : 'DOCTOR'}<//>
          </div>
        </div>
      </div>
    </header>

    <div class="lobby-body screen__scroll">
      <section class="lobby-left">
        <div class="section-label"><span class="section-label__idx num">01</span>Simulation Type<${MicroLabel}>MODE<//></div>
        <div class="mode-cards">
          ${MODE_CARDS.map((c) => html`<${ModeCard} key=${c.id} card=${c} selected=${roomMode === c.id} onSelect=${pickMode} />`)}
        </div>

        <div class="section-label"><span class="section-label__idx num">03</span>Join Alliance<${MicroLabel}>JOIN WITH ALLIANCE KEY<//></div>
        <${Panel} class="join-panel" tone="amber">
          <div class="join-row">
            <${TextField} size="code" icon="key" value=${code} placeholder="Enter alliance key / paste invite link"
              transform=${normalizeCode} onInput=${(v) => setCode(normalizeCode(v))} onEnter=${() => join()} />
            <${Button} variant="amber" size="lg" icon="users" loading=${busy === 'join'} disabled=${!codeOk || !online} onClick=${() => join()}>Join Alliance<//>
            <${Tooltip} text=${`Join as a spectator: no player seat is used, you can only watch (up to ${MAX_SPECTATORS} per alliance; available after the match starts too)`}>
              <${Button} variant="secondary" size="lg" icon="eye" class="join-spectate" loading=${busy === 'spectate'} disabled=${!codeOk || !online} onClick=${spectate}>Spectate<//>
            <//>
          </div>
          <div class="join-foot">
            ${recent.length ? html`<span class="t-lo">Recent Alliances</span>
              ${recent.map((c) => html`<button key=${c} type="button" class="code-chip num" title="Fill in key (does not join)"
                onClick=${() => setCode(c)}>${c}</button>`)}`
              : html`<span class="t-dim">Ask a teammate for the ${ROOM_CODE_LEN}-character alliance key, or open an invite link directly</span>`}
          </div>
        <//>
        <${TipsPanel} />
      </section>

      <section class="lobby-right">
        <div class="section-label"><span class="section-label__idx num">02</span>Simulation Difficulty<${MicroLabel}>DIFFICULTY<//></div>
        <div class="diff-list">
          ${DIFFICULTIES.map((d) => html`<${DifficultyCard} key=${d} roomMode=${roomMode} difficulty=${d} selected=${difficulty === d} onSelect=${pickDifficulty} />`)}
        </div>
        <div class="create-box">
          <${Tooltip} block=${true} text=${online ? null : 'Connecting to the server…'}>
            <${Button} variant="primary" size="xl" block=${true} iconRight="chevrons" loading=${busy === 'create'} disabled=${!online} onClick=${create}>
              ${roomMode === 'solo' ? 'Start Solo Simulation' : 'Create Alliance'}
            <//>
          <//>
          <div class="create-box__hint">
            ${online
              ? html`<span>${roomMode === 'solo' ? 'After creating, you can start the simulation right away' : 'After creating, you can invite friends or add AI teammates'}</span>`
              : html`<${Spinner} size="sm" label="CONNECTING" />`}
          </div>
        </div>
      </section>
    </div>
  </div>`;
}
