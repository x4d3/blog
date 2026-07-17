/* Hyrox Builder — a self-contained vanilla JS app (ES module).
 *
 * Data model
 *   Program { id, name, participants:[name], steps:[Step], runs:[Run] }
 *   Step    { id, type, params:{...}, assignedMask:int (bit i => participant i), mode:'parallel'|'sequence' }
 *   Run     { id, date, totalMs, steps:[{type,label,icon,params,mode,participants:[name],ms,splits:[{name,ms}]}] }
 *
 * All mutable state lives on an `App` instance (see class App). Pure helpers,
 * constants and the binary serializer are module-level functions.
 *
 * Persistence: program definitions are serialized to a compact versioned
 * binary blob (base64) under STORAGE_KEY; recorded runs are stored as JSON
 * under RUNS_KEY, realigned by index. The same binary blob is the share code.
 */

/* ------------------------------------------------------------------ *
 * Hyrox activity catalogue (official stations + running).
 * Default values are the standard Men's Open division; everything is
 * editable per step. A division picker can override the weights.
 * ------------------------------------------------------------------ */
const ACTIVITIES = {
  run: {
    name: 'Run', icon: '🏃',
    params: [{ key: 'distance', label: 'Distance', unit: 'm', default: 1000, step: 50, min: 0 }],
  },
  skierg: {
    name: 'SkiErg', icon: '🎿',
    params: [{ key: 'distance', label: 'Distance', unit: 'm', default: 1000, step: 50, min: 0 }],
  },
  sledPush: {
    name: 'Sled Push', icon: '🛷',
    params: [
      { key: 'distance', label: 'Distance', unit: 'm', default: 50, step: 5, min: 0 },
      { key: 'weight', label: 'Weight', unit: 'kg', default: 152, step: 1, min: 0 },
    ],
  },
  sledPull: {
    name: 'Sled Pull', icon: '🪢',
    params: [
      { key: 'distance', label: 'Distance', unit: 'm', default: 50, step: 5, min: 0 },
      { key: 'weight', label: 'Weight', unit: 'kg', default: 103, step: 1, min: 0 },
    ],
  },
  burpeeBroadJump: {
    name: 'Burpee Broad Jumps', icon: '🤸',
    params: [{ key: 'distance', label: 'Distance', unit: 'm', default: 80, step: 5, min: 0 }],
  },
  row: {
    name: 'Row', icon: '🚣',
    params: [{ key: 'distance', label: 'Distance', unit: 'm', default: 1000, step: 50, min: 0 }],
  },
  farmersCarry: {
    name: 'Farmers Carry', icon: '🧺',
    params: [
      { key: 'distance', label: 'Distance', unit: 'm', default: 200, step: 10, min: 0 },
      { key: 'weight', label: 'Weight / hand', unit: 'kg', default: 24, step: 1, min: 0 },
    ],
  },
  sandbagLunges: {
    name: 'Sandbag Lunges', icon: '🎒',
    params: [
      { key: 'distance', label: 'Distance', unit: 'm', default: 100, step: 5, min: 0 },
      { key: 'weight', label: 'Weight', unit: 'kg', default: 20, step: 1, min: 0 },
    ],
  },
  wallBalls: {
    name: 'Wall Balls', icon: '🏐',
    params: [
      { key: 'reps', label: 'Reps', unit: '', default: 100, step: 5, min: 0 },
      { key: 'weight', label: 'Weight', unit: 'kg', default: 6, step: 1, min: 0 },
      { key: 'target', label: 'Target', unit: 'm', default: 3.0, step: 0.1, min: 0 },
    ],
  },
};

// Palette order (running first so it's easy to drop between stations).
const PALETTE = ['run', 'skierg', 'sledPush', 'sledPull', 'burpeeBroadJump', 'row', 'farmersCarry', 'sandbagLunges', 'wallBalls'];

// Standard division weights for the "Load full Hyrox" helper.
const DIVISIONS = {
  'Men Open': { sledPush: 152, sledPull: 103, farmersCarry: 24, sandbagLunges: 20, wallBalls: 6, target: 3.0 },
  'Women Open': { sledPush: 102, sledPull: 78, farmersCarry: 16, sandbagLunges: 10, wallBalls: 4, target: 2.7 },
  'Men Pro': { sledPush: 202, sledPull: 153, farmersCarry: 32, sandbagLunges: 30, wallBalls: 9, target: 3.0 },
  'Women Pro': { sledPush: 152, sledPull: 103, farmersCarry: 24, sandbagLunges: 20, wallBalls: 6, target: 2.7 },
};

const STORAGE_KEY = 'hyrox-builder-v1';       // program definitions (binary)
const RUNS_KEY = 'hyrox-builder-runs-v1';     // recorded runs (JSON), aligned to programs by index
const MAX_PARTICIPANTS = 20;

/* ------------------------------------------------------------------ *
 * Small helpers
 * ------------------------------------------------------------------ */
const uid = () => 'x' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// Build a DOM node. props supports class, dataset, style(object),
// on<Event> handlers, html, and plain attributes. Children auto-appended.
const el = (tag, props, ...children) => {
  const e = document.createElement(tag);
  if (props) {
    for (const k of Object.keys(props)) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k === 'dataset') Object.assign(e.dataset, v);
      else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') e.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) e.setAttribute(k, '');
      else e.setAttribute(k, v);
    }
  }
  children.forEach((child) => append(e, child));
  return e;
};

const append = (parent, child) => {
  if (child == null || child === false) return;
  if (Array.isArray(child)) { child.forEach((c) => append(parent, c)); return; }
  parent.appendChild(child.nodeType ? child : document.createTextNode(String(child)));
};

// Format milliseconds as H:MM:SS(.t). Tenths shown for shorter clocks.
const fmt = (ms, tenths) => {
  ms = Math.max(0, Math.round(ms));
  const totalS = Math.floor(ms / 1000);
  const h = Math.floor(totalS / 3600);
  const m = Math.floor((totalS % 3600) / 60);
  const s = totalS % 60;
  const t = Math.floor((ms % 1000) / 100);
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  let out = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  if (tenths) out += '.' + t;
  return out;
};

const fmtDate = (iso) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

/* ------------------------------------------------------------------ *
 * Participant / step helpers. Participants are a plain array of names;
 * each step records which ones are assigned as a bitmask (bit i =>
 * participant at index i), keeping the stored data compact.
 * ------------------------------------------------------------------ */
const allAssignedMask = (count) => (1 << count) - 1;
const isAssigned = (mask, i) => (mask & (1 << i)) !== 0;
const assignedIndices = (mask, count) => {
  const out = [];
  for (let i = 0; i < count; i++) if (isAssigned(mask, i)) out.push(i);
  return out;
};
// Drop bit k and shift the higher bits down (used when a participant is removed).
const removeBit = (mask, k) => (mask & ((1 << k) - 1)) | ((mask >> (k + 1)) << k);

const participantName = (prog, i) => prog.participants[i] ?? '?';
const activityDef = (type) => ACTIVITIES[type] || { name: type, icon: '•', params: [] };
const paramsSummary = (step) =>
  activityDef(step.type).params.map((p) => step.params[p.key] + (p.unit || '')).join(' · ');

const makeStep = (prog, type, overrides) => {
  const def = activityDef(type);
  const params = {};
  def.params.forEach((p) => { params[p.key] = p.default; });
  if (overrides) Object.assign(params, overrides);
  return {
    id: uid(),
    type,
    params,
    assignedMask: allAssignedMask(prog.participants.length),
    mode: 'parallel',
  };
};

const badge = (text) => el('span', { class: 'hx-badge' }, text);

// Locate the step a drag is hovering over (for drag-to-reorder).
const getDragAfterElement = (container, y) => {
  const els = [...container.querySelectorAll('.hx-step:not(.dragging)')];
  let closest = { offset: -Infinity, element: null };
  els.forEach((child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) closest = { offset, element: child };
  });
  return closest.element;
};

// Shared run breakdown used by the summary and history views.
const runBreakdown = (run) => {
  const box = el('div', { class: 'hx-breakdown' });
  run.steps.forEach((s, i) => {
    box.appendChild(el('div', { class: 'hx-bd-row' },
      el('span', { class: 'hx-bd-name' }, `${i + 1}. ${s.icon || ''} ${s.label}`),
      el('span', { class: 'hx-bd-time' }, fmt(s.ms))
    ));
    if (s.splits && s.splits.length) {
      box.appendChild(el('div', { class: 'hx-bd-splits' },
        s.splits.map((sp) => el('span', { class: 'hx-bd-split' }, `${sp.name}: ${fmt(sp.ms, true)}`))));
    }
  });
  return box;
};

// Bring an imported program into the current shape (fresh id, no runs) while
// preserving each step's athlete assignments (participant order is stable, so
// the bitmask carries over directly).
const normalizeImported = (p) => {
  let participants = Array.isArray(p.participants)
    ? p.participants.map((x) => (typeof x === 'string' ? x : (x && x.name) || 'Athlete'))
    : [];
  if (participants.length === 0) participants = ['Athlete 1'];
  const count = participants.length;
  const steps = (p.steps || []).map((s) => ({
    id: uid(),
    type: s.type,
    params: s.params || {},
    assignedMask: typeof s.assignedMask === 'number'
      ? (s.assignedMask & allAssignedMask(count))
      : allAssignedMask(count),
    mode: s.mode === 'sequence' ? 'sequence' : 'parallel',
  }));
  return { id: uid(), name: p.name || 'Imported program', participants, steps, runs: [] };
};

/* ------------------------------------------------------------------ *
 * base64 <-> bytes helpers (used by the binary serializer below)
 * ------------------------------------------------------------------ */
const base64FromBytes = (bytes) => {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
};

const bytesFromBase64 = (b64) => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

/* ------------------------------------------------------------------ *
 * Compact binary (de)serialization — the single format used for BOTH
 * the copy/paste share code and localStorage. Values are written
 * positionally (no field names): a version byte, then per program the
 * name, participant names and steps (station index + mode + assignment
 * mask + the numeric params implied by that station's schema). The whole
 * buffer is base64-encoded so it stays plain text.
 *
 * VERSIONING: the first byte is SER_VERSION. decode() rejects any
 * version it doesn't know, so an old/foreign blob fails loudly instead
 * of being silently misread. Bump SER_VERSION whenever the byte layout
 * changes (and, if you need to keep reading old blobs, branch on it).
 * ------------------------------------------------------------------ */
const SER_VERSION = 1;
const SCALE = 10; // one decimal place covers every Hyrox parameter

const makeWriter = () => {
  const a = [];
  const w = {
    u8: (n) => { a.push(n & 0xff); return w; },
    vint: (n) => {
      n = Math.max(0, Math.round(n)) >>> 0;
      while (n > 0x7f) { a.push((n & 0x7f) | 0x80); n >>>= 7; }
      a.push(n);
      return w;
    },
    str: (s) => {
      const e = new TextEncoder().encode(s == null ? '' : String(s));
      w.vint(e.length);
      for (let i = 0; i < e.length; i++) a.push(e[i]);
      return w;
    },
    toBase64: () => base64FromBytes(new Uint8Array(a)),
  };
  return w;
};

const makeReader = (bytes) => {
  let pos = 0;
  const vint = () => {
    let n = 0, shift = 0, b;
    do { b = bytes[pos++]; n |= (b & 0x7f) << shift; shift += 7; } while (b & 0x80);
    return n >>> 0;
  };
  const str = () => {
    const len = vint();
    const s = new TextDecoder().decode(bytes.subarray(pos, pos + len));
    pos += len;
    return s;
  };
  return { u8: () => bytes[pos++], vint, str };
};

const writeStep = (w, step) => {
  const ti = PALETTE.indexOf(step.type);
  w.u8(ti < 0 ? 0 : ti);
  w.u8(step.mode === 'sequence' ? 1 : 0);
  w.vint(step.assignedMask >>> 0);
  activityDef(step.type).params.forEach((p) => w.vint(Math.round((step.params[p.key] || 0) * SCALE)));
};

const readStep = (r) => {
  const type = PALETTE[r.u8()] || 'run';
  const mode = r.u8() === 1 ? 'sequence' : 'parallel';
  const assignedMask = r.vint();
  const params = {};
  activityDef(type).params.forEach((p) => { params[p.key] = r.vint() / SCALE; });
  return { id: uid(), type, params, assignedMask, mode };
};

// Definitions only — this is exactly the shareable code. Recorded runs are
// persisted separately (see App#save), keeping this format simple.
const encode = (programs) => {
  const w = makeWriter();
  w.u8(SER_VERSION);
  w.vint(programs.length);
  programs.forEach((prog) => {
    w.str(prog.name);
    w.vint(prog.participants.length);
    prog.participants.forEach((n) => w.str(n));
    w.vint(prog.steps.length);
    prog.steps.forEach((s) => writeStep(w, s));
  });
  return w.toBase64();
};

const decode = (b64) => {
  const r = makeReader(bytesFromBase64(b64.replace(/\s+/g, '')));
  const version = r.u8();
  if (version !== SER_VERSION) throw new Error('unsupported version ' + version);
  const programs = [];
  const progCount = r.vint();
  for (let i = 0; i < progCount; i++) {
    const name = r.str();
    const participants = [];
    const pc = r.vint();
    for (let j = 0; j < pc; j++) participants.push(r.str());
    const steps = [];
    const sc = r.vint();
    for (let j = 0; j < sc; j++) steps.push(readStep(r));
    programs.push({ id: uid(), name, participants, steps, runs: [] });
  }
  return programs;
};

/* ------------------------------------------------------------------ *
 * App — owns every piece of mutable state and all the views.
 * ------------------------------------------------------------------ */
class App {
  constructor(root) {
    this.root = root;
    this.programs = [];
    this.view = 'home';     // 'home' | 'edit' | 'history' | 'run' | 'summary'
    this.editing = null;    // program being edited / inspected
    this.division = 'Men Open';
    this.runState = null;   // active run session (null when idle)
    this.runTimer = null;   // setInterval id for the run clock
    this.saveTimer = null;  // debounce id for scheduleSave
  }

  start() {
    this.load();
    this.render();
  }

  /* ------------------------------ Persistence ------------------------------ */
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, encode(this.programs)); // definitions
      localStorage.setItem(RUNS_KEY, JSON.stringify(this.programs.map((p) => p.runs || []))); // runs, by index
    } catch (e) {
      console.error('Hyrox Builder: save failed', e);
    }
  }

  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) { this.programs = []; return; }
    try {
      this.programs = decode(raw);
    } catch (e) {
      console.error('Hyrox Builder: load failed', e);
      this.programs = [];
      return;
    }
    // Runs are stored separately and realigned to programs by index.
    try {
      const runsByIndex = JSON.parse(localStorage.getItem(RUNS_KEY) || '[]');
      this.programs.forEach((p, i) => { if (Array.isArray(runsByIndex[i])) p.runs = runsByIndex[i]; });
    } catch (e) { /* leave runs empty */ }
  }

  scheduleSave() {
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => this.save(), 300);
  }

  getProgram(id) {
    return this.programs.find((p) => p.id === id) || null;
  }

  /* ------------------------------ Rendering ------------------------------ */
  render() {
    if (!this.root) return;
    this.root.innerHTML = '';
    const node =
      this.view === 'edit' ? this.renderEdit()
        : this.view === 'history' ? this.renderHistory()
          : this.view === 'run' ? this.renderRun()
            : this.view === 'summary' ? this.renderSummary()
              : this.renderHome();
    this.root.appendChild(node);
  }

  goHome() {
    this.view = 'home';
    this.render();
  }

  /* -------------------------------- Home -------------------------------- */
  renderHome() {
    const wrap = el('div', { class: 'hx-wrap' });

    wrap.appendChild(el('div', { class: 'hx-toolbar' },
      el('div', { class: 'hx-toolbar-title' }, 'Your programs'),
      el('div', { class: 'hx-toolbar-actions' },
        el('button', { class: 'hx-btn ghost', onclick: () => this.importPlans() }, '📥 Import'),
        this.programs.length
          ? el('button', { class: 'hx-btn ghost', onclick: () => this.exportPlans(this.programs) }, '📤 Export all')
          : null,
        el('button', {
          class: 'hx-btn',
          onclick: () => {
            const prog = { id: uid(), name: 'New Program', participants: ['Athlete 1'], steps: [], runs: [] };
            this.programs.unshift(prog);
            this.editing = prog;
            this.view = 'edit';
            this.save();
            this.render();
          },
        }, '+ New program')
      )
    ));

    if (this.programs.length === 0) {
      wrap.appendChild(el('div', { class: 'hx-empty' },
        el('div', { class: 'hx-empty-emoji' }, '🏋️‍♂️'),
        el('p', null, 'No programs yet. Create one to start building your Hyrox workout.')));
      return wrap;
    }

    const list = el('div', { class: 'hx-prog-list' });
    this.programs.forEach((prog) => {
      const runs = prog.runs || [];
      list.appendChild(el('div', { class: 'hx-prog-card' },
        el('div', { class: 'hx-prog-main' },
          el('div', { class: 'hx-prog-name' }, prog.name || 'Untitled'),
          el('div', { class: 'hx-prog-meta' },
            badge('👥 ' + prog.participants.length),
            badge(`🧱 ${prog.steps.length} step${prog.steps.length === 1 ? '' : 's'}`),
            badge(`⏱ ${runs.length} run${runs.length === 1 ? '' : 's'}`)
          )
        ),
        el('div', { class: 'hx-prog-actions' },
          el('button', {
            class: 'hx-btn', disabled: prog.steps.length === 0,
            title: prog.steps.length === 0 ? 'Add steps first' : 'Run this program',
            onclick: () => this.startRun(prog),
          }, '▶ Run'),
          el('button', {
            class: 'hx-btn secondary',
            onclick: () => { this.editing = prog; this.view = 'edit'; this.render(); },
          }, '✎ Edit'),
          el('button', {
            class: 'hx-btn ghost',
            onclick: () => { this.editing = prog; this.view = 'history'; this.render(); },
          }, '📊 History'),
          el('button', {
            class: 'hx-btn ghost', title: 'Export as a shareable code',
            onclick: () => this.exportPlans([prog]),
          }, '📤'),
          el('button', {
            class: 'hx-btn danger',
            onclick: () => {
              if (confirm(`Delete program "${prog.name || 'Untitled'}"? This cannot be undone.`)) {
                this.programs = this.programs.filter((p) => p.id !== prog.id);
                this.save();
                this.render();
              }
            },
          }, '🗑')
        )
      ));
    });
    wrap.appendChild(list);
    return wrap;
  }

  /* -------------------------------- Edit -------------------------------- */
  renderEdit() {
    const prog = this.editing;
    const wrap = el('div', { class: 'hx-wrap' });

    wrap.appendChild(el('div', { class: 'hx-toolbar' },
      el('button', { class: 'hx-btn ghost', onclick: () => this.goHome() }, '← Back'),
      el('button', {
        class: 'hx-btn', disabled: prog.steps.length === 0,
        onclick: () => this.startRun(prog),
      }, '▶ Run')
    ));

    wrap.appendChild(el('div', { class: 'hx-card' },
      el('label', { class: 'hx-label' }, 'Program name'),
      el('input', {
        class: 'hx-name-input', type: 'text', value: prog.name,
        placeholder: 'e.g. Race prep #3',
        oninput: (e) => { prog.name = e.target.value; this.scheduleSave(); },
      })
    ));

    wrap.appendChild(this.renderParticipants(prog));
    wrap.appendChild(this.renderStepsSection(prog));
    return wrap;
  }

  renderParticipants(prog) {
    const card = el('div', { class: 'hx-card' },
      el('div', { class: 'hx-card-head' },
        el('h3', { class: 'hx-h3' }, 'Participants'),
        el('button', {
          class: 'hx-btn secondary small',
          disabled: prog.participants.length >= MAX_PARTICIPANTS,
          onclick: () => {
            prog.participants.push('Athlete ' + (prog.participants.length + 1));
            this.save();
            this.render();
          },
        }, '+ Add')
      )
    );
    const listEl = el('div', { class: 'hx-participants' });
    prog.participants.forEach((name, i) => {
      listEl.appendChild(el('div', { class: 'hx-participant' },
        el('input', {
          class: 'hx-participant-input', type: 'text', value: name, placeholder: 'Name',
          oninput: (e) => { prog.participants[i] = e.target.value; this.scheduleSave(); },
        }),
        el('button', {
          class: 'hx-icon-btn danger',
          title: prog.participants.length <= 1 ? 'At least one participant is required' : 'Remove',
          disabled: prog.participants.length <= 1,
          onclick: () => {
            prog.participants.splice(i, 1);
            prog.steps.forEach((s) => { s.assignedMask = removeBit(s.assignedMask, i); });
            this.save();
            this.render();
          },
        }, '✕')
      ));
    });
    card.appendChild(listEl);
    return card;
  }

  renderStepsSection(prog) {
    const card = el('div', { class: 'hx-card' });
    card.appendChild(el('div', { class: 'hx-card-head' },
      el('h3', { class: 'hx-h3' }, 'Stations'),
      el('div', { class: 'hx-standard' },
        this.selectDivision(),
        el('button', {
          class: 'hx-btn secondary small',
          onclick: () => {
            if (prog.steps.length && !confirm(`Replace the current steps with a full standard Hyrox (${this.division})?`)) return;
            this.loadStandard(prog, this.division);
          },
        }, 'Load full Hyrox')
      )
    ));

    card.appendChild(el('p', { class: 'hx-hint' },
      'Drag a station into the list below, or tap it to append. Reorder with the ⠿ handle or the ▲▼ buttons.'));

    const palette = el('div', { class: 'hx-palette' });
    PALETTE.forEach((type) => {
      const def = ACTIVITIES[type];
      palette.appendChild(el('button', {
        class: 'hx-palette-item', draggable: 'true',
        ondragstart: (e) => {
          e.dataTransfer.setData('text/plain', JSON.stringify({ src: 'palette', type }));
          e.dataTransfer.effectAllowed = 'copy';
        },
        onclick: () => { prog.steps.push(makeStep(prog, type)); this.save(); this.render(); },
      }, el('span', { class: 'hx-pi-icon' }, def.icon), el('span', null, def.name)));
    });
    card.appendChild(palette);

    const listEl = el('div', { class: 'hx-steps' });
    listEl.addEventListener('dragover', (e) => e.preventDefault());
    listEl.addEventListener('drop', (e) => this.onStepDrop(e, prog, listEl));

    if (prog.steps.length === 0) {
      listEl.appendChild(el('div', { class: 'hx-steps-empty' }, 'Drop stations here'));
    } else {
      prog.steps.forEach((step, index) => listEl.appendChild(this.renderStepCard(prog, step, index)));
    }
    card.appendChild(listEl);
    return card;
  }

  selectDivision() {
    const sel = el('select', {
      class: 'hx-select', onchange: (e) => { this.division = e.target.value; },
    });
    Object.keys(DIVISIONS).forEach((name) => {
      const opt = el('option', { value: name }, name);
      if (name === this.division) opt.selected = true;
      sel.appendChild(opt);
    });
    return sel;
  }

  loadStandard(prog, division) {
    const d = DIVISIONS[division];
    const seq = [
      ['run'], ['skierg'],
      ['run'], ['sledPush', { weight: d.sledPush }],
      ['run'], ['sledPull', { weight: d.sledPull }],
      ['run'], ['burpeeBroadJump'],
      ['run'], ['row'],
      ['run'], ['farmersCarry', { weight: d.farmersCarry }],
      ['run'], ['sandbagLunges', { weight: d.sandbagLunges }],
      ['run'], ['wallBalls', { weight: d.wallBalls, target: d.target }],
    ];
    prog.steps = seq.map(([type, overrides]) => makeStep(prog, type, overrides));
    this.save();
    this.render();
  }

  renderStepCard(prog, step, index) {
    const def = activityDef(step.type);
    const card = el('div', { class: 'hx-step', dataset: { id: step.id } });

    const handle = el('div', { class: 'hx-drag', title: 'Drag to reorder', draggable: 'true' }, '⠿');
    handle.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({ src: 'list', id: step.id }));
      e.dataTransfer.effectAllowed = 'move';
      card.classList.add('dragging');
      try { e.dataTransfer.setDragImage(card, 20, 20); } catch (err) { /* not supported */ }
    });
    handle.addEventListener('dragend', () => card.classList.remove('dragging'));

    card.appendChild(el('div', { class: 'hx-step-head' },
      handle,
      el('span', { class: 'hx-step-num' }, index + 1),
      el('span', { class: 'hx-step-icon' }, def.icon),
      el('span', { class: 'hx-step-name' }, def.name),
      el('div', { class: 'hx-step-tools' },
        el('button', {
          class: 'hx-icon-btn', title: 'Move up', disabled: index === 0,
          onclick: () => this.moveStep(prog, index, index - 1),
        }, '▲'),
        el('button', {
          class: 'hx-icon-btn', title: 'Move down', disabled: index === prog.steps.length - 1,
          onclick: () => this.moveStep(prog, index, index + 1),
        }, '▼'),
        el('button', {
          class: 'hx-icon-btn danger', title: 'Remove',
          onclick: () => {
            prog.steps = prog.steps.filter((s) => s.id !== step.id);
            this.save();
            this.render();
          },
        }, '✕')
      )
    ));

    const params = el('div', { class: 'hx-params' });
    def.params.forEach((p) => {
      params.appendChild(el('label', { class: 'hx-param' },
        el('span', { class: 'hx-param-label' }, p.label + (p.unit ? ` (${p.unit})` : '')),
        el('input', {
          class: 'hx-param-input', type: 'number', step: p.step || 1,
          min: p.min != null ? p.min : 0, value: step.params[p.key],
          oninput: (e) => {
            const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
            step.params[p.key] = isNaN(val) ? 0 : val;
            this.scheduleSave();
          },
        })
      ));
    });
    card.appendChild(params);

    const assignRow = el('div', { class: 'hx-assign' }, el('span', { class: 'hx-assign-label' }, 'Athletes:'));
    prog.participants.forEach((name, i) => {
      const active = isAssigned(step.assignedMask, i);
      assignRow.appendChild(el('button', {
        class: 'hx-assign-chip' + (active ? ' active' : ''),
        onclick: () => {
          step.assignedMask ^= (1 << i);
          this.save();
          this.render();
        },
      }, name || 'Athlete'));
    });
    card.appendChild(assignRow);

    card.appendChild(el('div', { class: 'hx-mode' },
      el('span', { class: 'hx-assign-label' }, 'Execution:'),
      el('div', { class: 'hx-seg' },
        this.segButton(step, 'parallel', '⇉ Parallel'),
        this.segButton(step, 'sequence', '→ Sequence')
      )
    ));

    return card;
  }

  segButton(step, mode, label) {
    return el('button', {
      class: 'hx-seg-btn' + (step.mode === mode ? ' active' : ''),
      onclick: () => { step.mode = mode; this.save(); this.render(); },
    }, label);
  }

  moveStep(prog, from, to) {
    if (to < 0 || to >= prog.steps.length) return;
    const [moved] = prog.steps.splice(from, 1);
    prog.steps.splice(to, 0, moved);
    this.save();
    this.render();
  }

  onStepDrop(e, prog, listEl) {
    e.preventDefault();
    let data;
    try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch (err) { return; }
    const after = getDragAfterElement(listEl, e.clientY);
    const steps = prog.steps;
    const indexOfId = (id) => steps.findIndex((s) => s.id === id);

    if (data.src === 'palette') {
      let at = after == null ? steps.length : indexOfId(after.dataset.id);
      if (at < 0) at = steps.length;
      steps.splice(at, 0, makeStep(prog, data.type));
    } else if (data.src === 'list') {
      const from = indexOfId(data.id);
      if (from < 0) return;
      const [moved] = steps.splice(from, 1);
      let at = after == null ? steps.length : indexOfId(after.dataset.id);
      if (at < 0) at = steps.length;
      steps.splice(at, 0, moved);
    }
    this.save();
    this.render();
  }

  /* -------------------------------- Run -------------------------------- */
  startRun(prog) {
    if (!prog.steps.length) return;
    this.runState = {
      program: prog,
      stepIndex: 0,
      totalMs: 0,
      stepMs: 0,
      splitMs: 0,
      seqIndex: 0,
      splits: [],       // splits collected for the current step
      records: [],      // completed step records
      running: true,
      lastTick: Date.now(),
    };
    this.view = 'run';
    this.render();
    if (this.runTimer) clearInterval(this.runTimer);
    this.runTimer = setInterval(() => this.tick(), 100);
    this.requestFullscreen();
  }

  tick() {
    const rs = this.runState;
    if (!rs || !rs.running) return;
    const now = Date.now();
    const d = now - rs.lastTick;
    rs.lastTick = now;
    rs.totalMs += d;
    rs.stepMs += d;
    rs.splitMs += d;
    this.updateRunTimers();
  }

  updateRunTimers() {
    const rs = this.runState;
    const total = document.getElementById('hx-total');
    if (total) total.textContent = fmt(rs.totalMs, true);
    const stepT = document.getElementById('hx-steptime');
    if (stepT) stepT.textContent = fmt(rs.stepMs, true);
    const splitT = document.getElementById('hx-splittime');
    if (splitT) splitT.textContent = fmt(rs.splitMs, true);
  }

  currentStep() {
    return this.runState.program.steps[this.runState.stepIndex];
  }

  stepAthletes(step) {
    return assignedIndices(step.assignedMask, this.runState.program.participants.length);
  }

  completeParticipant() {
    const rs = this.runState;
    const ids = this.stepAthletes(this.currentStep());
    const i = ids[rs.seqIndex];
    rs.splits.push({ name: participantName(rs.program, i), ms: rs.splitMs });
    rs.splitMs = 0;
    rs.seqIndex++;
    if (rs.seqIndex >= ids.length) this.completeStep();
    else this.render();
  }

  completeStep() {
    const rs = this.runState;
    const step = this.currentStep();
    rs.records.push({
      type: step.type,
      label: activityDef(step.type).name,
      icon: activityDef(step.type).icon,
      params: JSON.parse(JSON.stringify(step.params)),
      mode: step.mode,
      participants: this.stepAthletes(step).map((i) => participantName(rs.program, i)),
      ms: rs.stepMs,
      splits: rs.splits.slice(),
    });
    rs.stepMs = 0;
    rs.splitMs = 0;
    rs.seqIndex = 0;
    rs.splits = [];
    rs.stepIndex++;
    if (rs.stepIndex >= rs.program.steps.length) this.finishRun();
    else this.render();
  }

  finishRun() {
    const rs = this.runState;
    rs.running = false;
    if (this.runTimer) { clearInterval(this.runTimer); this.runTimer = null; }
    const run = {
      id: uid(),
      date: new Date().toISOString(),
      totalMs: rs.totalMs,
      steps: rs.records,
    };
    const prog = this.getProgram(rs.program.id);
    if (prog) {
      if (!prog.runs) prog.runs = [];
      prog.runs.unshift(run);
      this.save();
    }
    rs.finishedRun = run;
    this.view = 'summary';
    this.exitFullscreen();
    this.render();
  }

  pauseResume() {
    const rs = this.runState;
    if (!rs) return;
    if (rs.running) rs.running = false;
    else { rs.running = true; rs.lastTick = Date.now(); }
    this.render();
  }

  exitRun() {
    if (!confirm('Stop this run? Progress will not be saved.')) return;
    if (this.runTimer) { clearInterval(this.runTimer); this.runTimer = null; }
    this.runState = null;
    this.exitFullscreen();
    this.view = 'home';
    this.render();
  }

  renderRun() {
    const rs = this.runState;
    const prog = rs.program;
    const step = this.currentStep();
    const def = activityDef(step.type);
    const wrap = el('div', { class: 'hx-run' });

    wrap.appendChild(el('div', { class: 'hx-run-bar' },
      el('button', { class: 'hx-btn ghost', onclick: () => this.exitRun() }, '✕ Stop'),
      el('div', { class: 'hx-run-title' }, prog.name || 'Program'),
      el('button', { class: 'hx-btn ghost', onclick: () => this.toggleFullscreen() }, '⛶ Full screen')
    ));

    wrap.appendChild(el('div', { class: 'hx-total-wrap' },
      el('div', { class: 'hx-total-label' }, 'Total time'),
      el('div', { class: 'hx-timer-total', id: 'hx-total' }, fmt(rs.totalMs, true))
    ));

    const panel = el('div', { class: 'hx-current' });
    panel.appendChild(el('div', { class: 'hx-current-top' },
      el('span', { class: 'hx-current-step-num' }, `Station ${rs.stepIndex + 1} / ${prog.steps.length}`),
      el('span', { class: 'hx-current-mode' }, step.mode === 'sequence' ? '→ Sequence' : '⇉ Parallel')
    ));
    panel.appendChild(el('div', { class: 'hx-current-name' },
      el('span', { class: 'hx-current-icon' }, def.icon), def.name));
    if (paramsSummary(step)) panel.appendChild(el('div', { class: 'hx-current-params' }, paramsSummary(step)));
    panel.appendChild(el('div', { class: 'hx-timer-step', id: 'hx-steptime' }, fmt(rs.stepMs, true)));

    const ids = assignedIndices(step.assignedMask, prog.participants.length);
    if (step.mode === 'sequence' && ids.length > 1) {
      const seqBox = el('div', { class: 'hx-seq-box' });
      ids.forEach((pi, i) => {
        const name = participantName(prog, pi);
        let cls = 'hx-seq-athlete';
        let right;
        if (i < rs.seqIndex) {
          cls += ' done';
          right = el('span', { class: 'hx-seq-time' }, fmt(rs.splits[i].ms, true));
        } else if (i === rs.seqIndex) {
          cls += ' active';
          right = el('span', { class: 'hx-seq-time live', id: 'hx-splittime' }, fmt(rs.splitMs, true));
        } else {
          right = el('span', { class: 'hx-seq-time' }, '—');
        }
        seqBox.appendChild(el('div', { class: cls }, el('span', null, `${i + 1}. ${name}`), right));
      });
      panel.appendChild(seqBox);
      const curName = participantName(prog, ids[rs.seqIndex]);
      panel.appendChild(el('button', { class: 'hx-btn big', onclick: () => this.completeParticipant() }, `✓ ${curName} done`));
    } else {
      if (ids.length) {
        panel.appendChild(el('div', { class: 'hx-current-athletes' },
          ids.map((pi) => el('span', { class: 'hx-chip' }, participantName(prog, pi)))));
      }
      panel.appendChild(el('button', { class: 'hx-btn big', onclick: () => this.completeStep() }, '✓ Complete station'));
    }

    const next = prog.steps[rs.stepIndex + 1];
    panel.appendChild(el('div', { class: 'hx-next' },
      next ? `Up next: ${activityDef(next.type).icon} ${activityDef(next.type).name}` : '🏁 Final station!'));
    wrap.appendChild(panel);

    wrap.appendChild(el('div', { class: 'hx-run-controls' },
      el('button', { class: 'hx-btn secondary', onclick: () => this.pauseResume() }, rs.running ? '⏸ Pause' : '▶ Resume')
    ));

    const rail = el('div', { class: 'hx-rail' });
    prog.steps.forEach((s, i) => {
      const d = activityDef(s.type);
      let cls = 'hx-rail-item';
      let right = '';
      if (i < rs.stepIndex) { cls += ' done'; right = fmt(rs.records[i].ms); }
      else if (i === rs.stepIndex) cls += ' active';
      rail.appendChild(el('div', { class: cls },
        el('span', { class: 'hx-rail-name' }, `${i + 1}. ${d.icon} ${d.name}`),
        el('span', { class: 'hx-rail-time' }, right)));
    });
    wrap.appendChild(el('div', { class: 'hx-rail-wrap' }, el('div', { class: 'hx-rail-title' }, 'Program'), rail));

    return wrap;
  }

  /* ------------------------------ Summary ------------------------------ */
  renderSummary() {
    const run = this.runState ? this.runState.finishedRun : null;
    const wrap = el('div', { class: 'hx-wrap hx-summary' });
    wrap.appendChild(el('div', { class: 'hx-summary-hero' },
      el('div', { class: 'hx-summary-emoji' }, '🏁'),
      el('div', { class: 'hx-summary-title' }, 'Program complete!'),
      el('div', { class: 'hx-timer-total big' }, fmt(run ? run.totalMs : 0, true))
    ));

    if (run) wrap.appendChild(runBreakdown(run));

    const prog = this.runState ? this.getProgram(this.runState.program.id) : null;
    wrap.appendChild(el('div', { class: 'hx-toolbar center' },
      el('button', { class: 'hx-btn', onclick: () => { this.runState = null; this.goHome(); } }, '✓ Done'),
      prog ? el('button', {
        class: 'hx-btn secondary',
        onclick: () => { this.editing = prog; this.runState = null; this.view = 'history'; this.render(); },
      }, '📊 View history') : null
    ));
    return wrap;
  }

  /* ------------------------------ History ------------------------------ */
  renderHistory() {
    const prog = this.editing;
    const runs = prog.runs || [];
    const wrap = el('div', { class: 'hx-wrap' });

    wrap.appendChild(el('div', { class: 'hx-toolbar' },
      el('button', { class: 'hx-btn ghost', onclick: () => this.goHome() }, '← Back'),
      el('div', { class: 'hx-toolbar-title' }, prog.name || 'Untitled')
    ));

    if (runs.length === 0) {
      wrap.appendChild(el('div', { class: 'hx-empty' },
        el('div', { class: 'hx-empty-emoji' }, '📊'),
        el('p', null, 'No runs recorded yet. Run this program to see your times here.')));
      return wrap;
    }

    const list = el('div', { class: 'hx-runs' });
    runs.forEach((run) => {
      const details = el('details', { class: 'hx-run-item' });
      details.appendChild(el('summary', { class: 'hx-run-summary' },
        el('span', { class: 'hx-run-date' }, fmtDate(run.date)),
        el('span', { class: 'hx-run-total' }, fmt(run.totalMs)),
        el('button', {
          class: 'hx-icon-btn danger', title: 'Delete run',
          onclick: (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm(`Delete this run from ${fmtDate(run.date)}?`)) {
              prog.runs = prog.runs.filter((r) => r.id !== run.id);
              this.save();
              this.render();
            }
          },
        }, '🗑')
      ));
      details.appendChild(runBreakdown(run));
      list.appendChild(details);
    });
    wrap.appendChild(list);
    return wrap;
  }

  /* ------------------------------ Export / import ------------------------------ *
   * A program travels as one copy/paste text code — exactly the binary
   * serializer used for storage (encode / decode), so a shared code is just a
   * program definition without runs.
   * -------------------------------------------------------------------------- */
  showModal(title, body) {
    const close = () => {
      overlay.remove();
      document.removeEventListener('keydown', onKey);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    const overlay = el('div', {
      class: 'hx-modal-overlay',
      onclick: (e) => { if (e.target === overlay) close(); },
    });
    overlay.appendChild(el('div', { class: 'hx-modal' },
      el('div', { class: 'hx-modal-head' },
        el('h3', { class: 'hx-h3' }, title),
        el('button', { class: 'hx-icon-btn', title: 'Close', onclick: close }, '✕')),
      body));
    document.addEventListener('keydown', onKey);
    this.root.appendChild(overlay);
    return { close };
  }

  exportPlans(programs) {
    const code = encode(programs);
    const ta = el('textarea', { class: 'hx-code', readonly: true, spellcheck: 'false', rows: 5 });
    ta.value = code;
    const copyBtn = el('button', {
      class: 'hx-btn',
      onclick: async () => {
        ta.focus();
        ta.select();
        try { await navigator.clipboard.writeText(code); }
        catch (e) { try { document.execCommand('copy'); } catch (err) { /* ignore */ } }
        copyBtn.textContent = '✓ Copied';
        setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
      },
    }, 'Copy');
    this.showModal('Export ' + (programs.length === 1 ? 'program' : 'programs'),
      el('div', { class: 'hx-modal-body' },
        el('p', { class: 'hx-hint' }, 'Copy this code and share it. Paste it into Import to load the program.'),
        ta,
        el('div', { class: 'hx-modal-actions' }, copyBtn)));
    ta.focus();
    ta.select();
  }

  importPlans() {
    const ta = el('textarea', {
      class: 'hx-code', spellcheck: 'false', rows: 5,
      placeholder: 'Paste a program code here…',
    });
    const modal = this.showModal('Import program', el('div', { class: 'hx-modal-body' },
      el('p', { class: 'hx-hint' }, 'Paste a program code someone shared with you.'),
      ta,
      el('div', { class: 'hx-modal-actions' },
        el('button', {
          class: 'hx-btn',
          onclick: () => {
            const code = ta.value.trim();
            if (!code) { ta.focus(); return; }
            try {
              const data = decode(code);
              const progs = Array.isArray(data) ? data : (data && data.programs);
              if (!Array.isArray(progs)) throw new Error('unrecognised code');
              progs.forEach((p) => {
                if (p && typeof p === 'object') this.programs.unshift(normalizeImported(p));
              });
              this.save();
              modal.close();
              this.render();
            } catch (e) {
              alert('Import failed: ' + e.message);
            }
          },
        }, 'Import'))));
    ta.focus();
  }

  /* ------------------------------ Fullscreen ------------------------------ */
  requestFullscreen() {
    try {
      if (this.root.requestFullscreen) this.root.requestFullscreen().catch(() => {});
      else if (this.root.webkitRequestFullscreen) this.root.webkitRequestFullscreen();
    } catch (e) { /* ignore */ }
  }

  exitFullscreen() {
    try {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
      else if (document.webkitFullscreenElement && document.webkitExitFullscreen) document.webkitExitFullscreen();
    } catch (e) { /* ignore */ }
  }

  toggleFullscreen() {
    if (document.fullscreenElement || document.webkitFullscreenElement) this.exitFullscreen();
    else this.requestFullscreen();
  }
}

/* ------------------------------------------------------------------ *
 * Bootstrap — this is a module (deferred), so the DOM is already parsed.
 * ------------------------------------------------------------------ */
const rootEl = document.getElementById('hyrox-app');
if (rootEl) new App(rootEl).start();
