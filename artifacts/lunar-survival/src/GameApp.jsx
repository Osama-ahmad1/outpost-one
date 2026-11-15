import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, RotateCcw, BookOpen, HelpCircle, Home, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Hand, ScrollText, X, Gauge } from 'lucide-react';
import World from './world/World.jsx';
import { createGame, tickGame, movePlayer, interact, chooseEvent, getAdvisor, getNearby, getRating, LOCATIONS, MISSIONS } from './game/engine.js';
import { SCIENCE_SOURCE, SCIENCE_FACTS } from './game/science.js';
import ScienceNotes from './components/science-notes.jsx';
import EngineeringDecision from './components/engineering-decision.jsx';
import MissionLearning from './components/mission-learning.jsx';
import StructureInfo from './components/structure-info.jsx';
import { respondToQuestion } from './game/mission-learning.js';
import { restoreMissionState } from './game/mission-report.js';
import { getStormEducation, getCriticalResources, SIMULATION_NOTE } from './game/flight-guidance.js';
import './game.css';
import { buildMissionReport } from './game/mission-report.js';
import './components/mission-report.css';

const SAVE_KEY = 'outpost-one-save';
const SAVE_VERSION = 2;
const METERS = [
  { k: 'oxygen', label: 'O2', name: 'Oxygen', c: 'var(--o2)' },
  { k: 'energy', label: 'PWR', name: 'Energy', c: 'var(--pwr)' },
  { k: 'water', label: 'H2O', name: 'Water', c: 'var(--h2o)' },
  { k: 'food', label: 'FOOD', name: 'Food', c: 'var(--food)' },
  { k: 'shield', label: 'SHLD', name: 'Shield', c: 'var(--shld)' },
];

function fmtTime(s) {
  const t = Math.floor(s || 0);
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
  return `${h ? h + ':' : ''}${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
function loadSave() {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (raw && raw.version === SAVE_VERSION && raw.state && raw.state.status === 'playing') {
      return restoreMissionState(raw.state);
    }
  } catch { /* ignore */ }
  return null;
}

/* tiny WebAudio ambience: low habitat drone + subtle hiss */
function useAmbience(on) {
  const ctx = useRef(null);
  useEffect(() => {
    if (!on) { ctx.current?.close(); ctx.current = null; return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = new AC(); ctx.current = c;
    const g = c.createGain(); g.gain.value = 0.05; g.connect(c.destination);
    [55, 82.4, 110.3].forEach((f, i) => {
      const o = c.createOscillator(); o.type = i ? 'sine' : 'triangle'; o.frequency.value = f;
      const og = c.createGain(); og.gain.value = i ? 0.25 : 0.5; o.connect(og).connect(g); o.start();
    });
    return () => { c.close(); };
  }, [on]);
  return ctx;
}

function Brand({ small }) {
  return (
    <div className={`brand ${small ? 'brand-sm' : ''}`}>
      <svg viewBox="0 0 40 40" className="brand-mark" aria-hidden>
        <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M8 26 Q20 14 32 26" fill="none" stroke="var(--amber)" strokeWidth="2.4" />
        <circle cx="27" cy="12" r="3" fill="var(--o2)" />
      </svg>
      <div>
        <div className="brand-kicker">Shackleton Rim · Sector 7</div>
        <div className="brand-title">OUTPOST ONE</div>
        {!small && <div className="brand-sub">Lunar Survival</div>}
      </div>
    </div>
  );
}

function Menu({ onStart, onContinue, hasSave }) {
  const [panel, setPanel] = useState(null);
  const [diff, setDiff] = useState('normal');
  return (
    <div className="menu">
      <div className="menu-left">
        <Brand />
        <p className="menu-lede">Four crew. One habitat. The nearest help is 384,400 km overhead. Walk the base, bring the systems online, and get everyone through the storm.</p>
        <div className="diff" role="radiogroup" aria-label="Difficulty">
          {['easy', 'normal', 'hard'].map((d) => (
            <button key={d} data-testid={`button-difficulty-${d}`} className={diff === d ? 'on' : ''} onClick={() => setDiff(d)}>{d}</button>
          ))}
        </div>
        <div className="menu-actions">
          <button className="btn btn-primary" data-testid="button-start" onClick={() => onStart(diff)}><Play size={16} /> Start Mission</button>
          {hasSave && <button className="btn" data-testid="button-continue" onClick={onContinue}><RotateCcw size={16} /> Continue Mission</button>}
          <button className="btn" data-testid="button-briefing" onClick={() => setPanel('brief')}><BookOpen size={16} /> Mission Briefing</button>
          <button className="btn" data-testid="button-howto" onClick={() => setPanel('how')}><HelpCircle size={16} /> How to Play</button>
        </div>
      </div>
      {panel && (
        <div className="sheet" data-testid={`panel-${panel}`}>
          <button className="sheet-x" onClick={() => setPanel(null)} data-testid="button-close-panel" aria-label="Close"><X size={18} /></button>
          {panel === 'brief' ? <Briefing /> : <HowTo />}
        </div>
      )}
    </div>
  );
}

function Briefing() {
  return (
    <div>
      <div className="eyebrow">Mission Briefing · File 01</div>
      <h2>Keep the crew breathing.</h2>
      <p>You are the commander of Outpost One, a four-person research station on the rim of Shackleton crater. The supply lander is late. Long-range sensors predict a solar particle event.</p>
      <ol className="mlist">
        {MISSIONS.map((m, i) => <li key={m.id}><span>{String(i + 1).padStart(2, '0')}</span><b>{m.title}</b><em>{m.description}</em></li>)}
      </ol>
      <div className="facts">{SCIENCE_FACTS.slice(0, 3).map((f) => <p key={f}>{f}</p>)}</div>
      <ScienceNotes />
    </div>
  );
}
function HowTo() {
  return (
    <div>
      <div className="eyebrow">Field Manual</div>
      <h2>How to play</h2>
      <dl className="keys">
        <dt>W A S D / Arrows</dt><dd>Walk the astronaut (or drive the rover).</dd>
        <dt>Click the ground</dt><dd>Walk to that point automatically.</dd>
        <dt>E / Space</dt><dd>Interact with the nearest structure. Stay close while work runs.</dd>
        <dt>I</dt><dd>Press I near a structure to learn about it.</dd>
        <dt>Touch pad</dt><dd>On phones, use the on-screen pad and the ACT button.</dd>
        <dt>Esc / P</dt><dd>Pause. Change speed with the 1x/2x/4x control.</dd>
      </dl>
      <p>Watch the five life-support meters. If any essential one runs dry, the mission fails. When the storm warning sounds, get inside the regolith shelter.</p>
      <p dir="rtl" lang="ar" className="ar">تحرّك بالأسهم أو WASD، اضغط E للتفاعل، واحمِ الطاقم من العاصفة الشمسية داخل الملجأ.</p>
    </div>
  );
}

function Meter({ m, v }) {
  const low = v < 25;
  return (
    <div className={`meter ${low ? 'low' : ''}`} data-testid={`meter-${m.k}`} title={m.name}>
      <div className="meter-top"><span>{m.label}</span><b>{Math.round(v)}</b></div>
      <div className="meter-bar"><i style={{ transform: `scaleX(${Math.max(0, Math.min(100, v)) / 100})`, background: m.c }} /></div>
    </div>
  );
}

function Minimap({ game, onPick }) {
  const S = 120, scale = S / 70;
  const tx = (x) => S / 2 + (x - 4) * scale, tz = (z) => S / 2 + (z + 7) * scale;
  const cur = MISSIONS[game.stage]?.target;
  return (
    <svg className="minimap" viewBox={`0 0 ${S} ${S}`} data-testid="minimap">
      <circle cx={S / 2} cy={S / 2} r={S / 2 - 2} className="mm-bg" />
      {[20, 40].map((r) => <circle key={r} cx={S / 2} cy={S / 2} r={r} className="mm-ring" />)}
      {LOCATIONS.map((location) => {
        const l = location.id === 'rover'
          ? { ...location, ...(game.rover ? game.player : game.roverPosition || location) }
          : location;
        return (
        <g key={l.id} onClick={() => onPick(l)} style={{ cursor: 'pointer' }} data-testid={`map-loc-${l.id}`}>
          <rect x={tx(l.x) - 3} y={tz(l.z) - 3} width="6" height="6" className={`mm-loc ${game.systems?.[l.id] || game.completed.includes(l.id) ? 'done' : ''} ${cur === l.id ? 'cur' : ''}`} transform={`rotate(45 ${tx(l.x)} ${tz(l.z)})`} />
        </g>
        );
      })}
      <circle cx={tx(game.player.x)} cy={tz(game.player.z)} r="3.4" className="mm-me" />
    </svg>
  );
}

function Hud({ game, setGame, paused, setPaused, speed, setSpeed, sound, setSound, onNavigate, onMenu, onInfo }) {
  const near = getNearby(game);
  const mission = MISSIONS[game.stage];
  const advisor = getAdvisor(game);
  const criticalResources = getCriticalResources(game);
  const [logOpen, setLogOpen] = useState(false);
  const act = (id) => setGame((g) => g.event ? g : interact(g, id));
  const storm = game.storm || {};
  const fact = SCIENCE_FACTS[Math.floor((game.time || 0) / 40) % SCIENCE_FACTS.length];

  return (
    <div className={`hud ${storm.phase === 'active' ? 'storm' : ''}`}>
      <header className="hud-top">
        <Brand small />
        <div className="meters">{METERS.map((m) => <Meter key={m.k} m={m} v={game.resources[m.k]} />)}</div>
        <div className="hud-ctrl">
          <span className="clock" data-testid="text-time">T+{fmtTime(game.time)}</span>
          <button className="ibtn" data-testid="button-speed" onClick={() => setSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}><Gauge size={15} />{speed}x</button>
          <button className="ibtn" data-testid="button-sound" onClick={() => setSound((s) => !s)} aria-label="Sound">{sound ? <Volume2 size={15} /> : <VolumeX size={15} />}</button>
          <button className="ibtn" data-testid="button-log" onClick={() => setLogOpen((o) => !o)} aria-label="Log"><ScrollText size={15} /></button>
          <button className="ibtn" data-testid="button-pause" onClick={() => setPaused(true)} aria-label="Pause"><Pause size={15} /></button>
        </div>
      </header>

      {storm.phase === 'warning' && <div className="banner warn" data-testid="banner-storm">Solar particle event inbound · {Math.ceil(storm.remaining)}s · get to the shelter</div>}
      {storm.phase === 'active' && <div className="banner danger" data-testid="banner-storm">Storm active · {Math.ceil(storm.remaining)}s · {game.sheltered ? 'crew shielded' : 'exposed to radiation'}</div>}

      <aside className="mission-card" data-testid="card-mission">
        <div className="eyebrow">Objective {Math.min(game.stage + 1, 8)} / 8 · {game.xp} XP</div>
        <h3>{mission?.title || 'All objectives complete'}</h3>
        <p>{mission?.description}</p>
        <ul className="steps">
          {MISSIONS.map((m, i) => (
            <li key={m.id} className={game.completed.includes(m.id) ? 'done' : i === game.stage ? 'cur' : ''} title={m.title}
              onClick={() => { const l = LOCATIONS.find((x) => x.id === m.target); if (l) onNavigate(l); }} data-testid={`step-${m.id}`} />
          ))}
        </ul>
        {mission && LOCATIONS.find((l) => l.id === mission.target) && (
          <button className="link" data-testid="button-goto-objective" onClick={() => onNavigate(LOCATIONS.find((l) => l.id === mission.target))}>Walk to objective</button>
        )}
        <MissionLearning game={game} onAnswer={(id, answer) => setGame(g => respondToQuestion(g, id, answer))} />
      </aside>

      <aside className="advisor" data-testid="panel-advisor" data-guidance-controls>
        <div className="eyebrow"><span className="dot" /> Mission Advisor · rule-based · not AI</div>
        <p data-testid="text-advisor">{advisor}</p>
        <details className="flight-notes" open={storm.phase === 'warning' || storm.phase === 'active'} data-testid="storm-education">
          <summary>Storm science · {storm.phase || 'quiet'}{storm.phase === 'warning' || storm.phase === 'active' ? ` · ${Math.ceil(storm.remaining)}s` : ''}</summary>
          <p data-testid={`storm-education-${storm.phase || 'quiet'}`}>{getStormEducation(game)}</p>
          <p className="simulation-note">{SIMULATION_NOTE}</p>
        </details>
        {criticalResources.length > 0 && (
          <div className="critical-notes" data-testid="critical-resources">
            <p className="simulation-note">Critical reserves · simplified game simulation values</p>
            {criticalResources.map((resource, index) => (
              <details className="flight-notes" key={resource.id} open={index === 0} data-testid={`critical-${resource.id}`}>
                <summary>{resource.id.toUpperCase()} · {Math.round(resource.value)} points</summary>
                <p>{resource.explanation}</p>
              </details>
            ))}
          </div>
        )}
        {game.notice && <p className="notice" data-testid="text-notice">{game.notice}</p>}
        <p className="fact">{fact}</p>
      </aside>

      <div className="map-wrap"><Minimap game={game} onPick={onNavigate} /></div>

      {game.progress && (
        <div className="progress" data-testid="progress-work">
          <span>{game.progress.label}</span>
          <div className="pbar"><i style={{ transform: `scaleX(${1 - game.progress.remaining / game.progress.total})` }} /></div>
        </div>
      )}

      <div className="act-zone">
        {near ? (
          <button className="act" data-testid={`button-interact-${near.id}`} onClick={() => act(near.id)}>
            <small>{near.name}</small>
            <span>{game.sheltered && near.id === 'shelter' ? 'Exit shelter' : game.rover && near.id === 'rover' ? 'Exit rover' : near.action}</span>
            <kbd>E</kbd>
          </button>
        ) : game.sheltered ? (
          <button className="act" data-testid="button-exit-shelter" onClick={() => act('shelter')}><small>Shelter</small><span>Exit shelter</span><kbd>E</kbd></button>
        ) : game.rover ? (
          <button className="act" data-testid="button-exit-rover" onClick={() => act('rover')}><small>Rover</small><span>Exit rover</span><kbd>E</kbd></button>
        ) : <div className="act ghost">Move near a structure to interact</div>}
        {near && !game.event && <button className="ibtn structure-info-hint" data-testid="button-structure-info" onClick={onInfo} aria-label={`Learn about ${near.name}`}><kbd>I</kbd> Info</button>}
      </div>

      {logOpen && (
        <div className="log" data-testid="panel-log">
          <div className="eyebrow">Decision log</div>
          {[...game.log].reverse().map((l, i) => <div key={i} className="log-row"><time>{fmtTime(l.time)}</time><span>{l.text}</span>{l.effect && <em>{l.effect}</em>}</div>)}
        </div>
      )}

      {game.event && (
        <div className="modal-scrim">
          <EngineeringDecision event={game.event} difficulty={game.difficulty} onChoose={(id) => setGame((g) => chooseEvent(g, id))} />
        </div>
      )}

      {paused && (
        <div className="modal-scrim">
          <div className="modal small" data-testid="modal-pause">
            <div className="eyebrow">Simulation held</div>
            <h2>Paused</h2>
            <div className="menu-actions">
              <button className="btn btn-primary" data-testid="button-resume" onClick={() => setPaused(false)}><Play size={16} /> Resume</button>
              <button className="btn" data-testid="button-restart" onClick={() => { setGame(createGame(game.difficulty)); setPaused(false); }}><RotateCcw size={16} /> Restart mission</button>
              <button className="btn" data-testid="button-main-menu" onClick={onMenu}><Home size={16} /> Main menu</button>
            </div>
          </div>
        </div>
      )}
      <footer className="foot">{SCIENCE_SOURCE.label}</footer>
    </div>
  );
}

function TouchPad({ touchRef, onAct }) {
  const set = (x, z) => () => { touchRef.current = { x, z }; };
  const clr = () => { touchRef.current = { x: 0, z: 0 }; };
  const b = (x, z, Icon, id) => (
    <button data-testid={`touch-${id}`} className={`tp tp-${id}`} onPointerDown={set(x, z)} onPointerUp={clr} onPointerLeave={clr} onPointerCancel={clr}><Icon size={22} /></button>
  );
  return (
    <div className="touchpad">
      <div className="tp-grid">
        {b(0, -1, ChevronUp, 'up')}{b(-1, 0, ChevronLeft, 'left')}{b(1, 0, ChevronRight, 'right')}{b(0, 1, ChevronDown, 'down')}
      </div>
      <button className="tp-act" data-testid="touch-act" onClick={onAct}><Hand size={22} />ACT</button>
    </div>
  );
}

function Outcome({ game, onReplay, onMenu, setGame }) {
  const won = game.status === 'won';
  const r = buildMissionReport(game);
  const partial = !r.historyComplete || r.decisions.length !== r.measuredDecisions;
  const responses = Array.isArray(r.learning?.responses) ? r.learning.responses : Object.values(r.learning?.responses || {});
  const skipped = responses.filter(x => x?.skipped === true).length;
  return (
    <div className="outcome mr-outcome" data-testid="screen-outcome">
      <div className="outcome-inner">
        <div className="eyebrow">{won ? 'Mission complete' : 'Mission lost'} · T+{fmtTime(game.time)}</div>
        <h1 className={won ? 'won' : 'lost'}>{getRating(game)}</h1>
        <p className="mr-reason" data-testid="report-rating-reason">{r.reason}</p>
        <p className="cause">{won ? 'The crew made it through. Outpost One is fully operational.' : game.cause || 'Life support failed.'}</p>
        <div className="mr-grid">
          <section className="mr-sec" data-testid="report-mission">
            <h2>Mission Performance</h2>
            <dl className="mr-dl">
              <dt>Status</dt><dd>{won ? 'Completed' : 'Lost'}</dd>
              <dt>Score</dt><dd>{r.score} / 1600 XP</dd>
              <dt>Objectives</dt><dd>{r.objectives} / 8</dd>
              <dt>Duration</dt><dd>T+{fmtTime(game.time)}</dd>
              <dt>Difficulty</dt><dd>{game.difficulty || 'Not recorded'}</dd>
              <dt>Lowest reserve</dt><dd>{r.lowestReserve === null ? 'Not recorded' : Math.round(r.lowestReserve) + ' pts'}{r.lowestReserve !== null && !r.historyComplete ? ' (since tracking began)' : ''}</dd>
            </dl>
            <div className="mr-meters">{METERS.map((m) => <Meter key={m.k} m={m} v={game.resources[m.k]} />)}</div>
          </section>
          <section className="mr-sec" data-testid="report-engineering">
            <h2>Engineering Performance</h2>
            <p>{r.decisions.length} engineering decision{r.decisions.length === 1 ? '' : 's'} · {r.measuredDecisions} measured</p>
            {r.decisions.length > 0 && (
              <details className="mr-details" open={r.decisions.length <= 3}>
                <summary>Decisions made</summary>
                <ol className="mr-list">{r.decisions.map((d, i) => (
                  <li key={i} data-testid={`report-decision-${i + 1}`}>
                    <time>T+{fmtTime(d.time)}</time> {d.text}
                    {d.changes
                      ? <span className="mr-actual">Actual: {METERS.map(m => `${m.label} ${d.changes[m.k] > 0 ? '+' : ''}${Math.round(d.changes[m.k] * 10) / 10}`).join(' · ')} pts</span>
                      : <span className="mr-na">Actual change unavailable (not measured)</span>}
                    {d.statedEffect && <span className="mr-stated">Stated cost (log text, not measured): {d.statedEffect}</span>}
                  </li>))}</ol>
              </details>
            )}
            <table className="mr-table"><thead><tr><th>Resource</th><th>Measured cost</th><th>Measured benefit</th></tr></thead>
              <tbody>{METERS.map(m => <tr key={m.k}><td>{m.name}</td><td>-{Math.round(r.totals[m.k].cost * 10) / 10} pts</td><td>+{Math.round(r.totals[m.k].benefit * 10) / 10} pts</td></tr>)}</tbody></table>
            <p className="mr-note">Values are meter points from measured decisions only.</p>
            {partial && <p className="mr-warn">History partial: earlier reserve history or decision measurements are unavailable. Totals include measured decisions only.</p>}
            <dl className="mr-dl">
              <dt>Shelter response</dt><dd>{r.shelterResponse}</dd>
              <dt>Critical failures</dt><dd>{r.criticalFailures.length ? <ul className="mr-fail">{r.criticalFailures.map((f, i) => <li key={i}>{f}</li>)}</ul> : 'None recorded'}</dd>
            </dl>
          </section>
          <section className="mr-sec" data-testid="report-education">
            <h2>Educational Performance</h2>
            <dl className="mr-dl">
              <dt>Questions answered</dt><dd>{r.learning?.answered ?? 0}</dd>
              <dt>Correct</dt><dd>{r.learning?.correct ?? 0}</dd>
              <dt>Skipped</dt><dd>{skipped}</dd>
              <dt>Sources explored</dt><dd data-testid="report-source-exploration">{r.sourcesExplored === null ? 'Not tracked — source clicks were not recorded' : r.sourcesExplored}</dd>
            </dl>
            <details className="mr-details">
              <summary>Mission concepts encountered ({r.concepts.length})</summary>
              <p className="mr-note">From completed objectives. Encountered in play; not confirmation they were read or mastered.</p>
              <ul className="mr-list">{r.concepts.map((c, i) => <li key={i}>{c}</li>)}</ul>
            </details>
          </section>
        </div>
        <MissionLearning game={game} onAnswer={(id, answer) => setGame(g => respondToQuestion(g, id, answer))} />
        <details className="mr-details mr-log">
          <summary>Mission log ({game.log.length})</summary>
          <div className="log inline">{game.log.map((l, i) => <div key={i} className="log-row"><time>{fmtTime(l.time)}</time><span>{l.text}</span>{l.effect && <em>{l.effect}</em>}</div>)}</div>
        </details>
        <p className="xp">{game.xp} XP · {game.completed.length}/8 objectives</p>
        <div className="menu-actions row">
          <button className="btn btn-primary" data-testid="button-replay" onClick={onReplay}><RotateCcw size={16} /> Replay mission</button>
          <button className="btn" data-testid="button-outcome-menu" onClick={onMenu}><Home size={16} /> Main menu</button>
        </div>
      </div>
    </div>
  );
}

export default function GameApp() {
  const [mode, setMode] = useState('menu');
  const [game, setGame] = useState(null);
  const [paused, setPaused] = useState(false);
  const [infoId, setInfoId] = useState(null);
  const infoRef = useRef(null);
  const [speed, setSpeed] = useState(1);
  const [sound, setSound] = useState(false);
  const [saved, setSaved] = useState(() => loadSave());
  const targetRef = useRef(null);
  const touchRef = useRef({ x: 0, z: 0 });
  const gameRef = useRef(game); gameRef.current = game;
  useAmbience(sound && mode === 'play');

  const setInfo = useCallback((id) => {
    infoRef.current = id;
    targetRef.current = null;
    touchRef.current = { x: 0, z: 0 };
    setInfoId(id);
  }, []);
  const openInfo = useCallback(() => {
    const current = gameRef.current;
    if (!current || current.status !== 'playing' || current.event || paused) return;
    const near = getNearby(current);
    if (near) setInfo(near.id);
  }, [paused, setInfo]);
  const running = mode === 'play' && game && game.status === 'playing' && !paused && !infoId;
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setGame((g) => (g && g.status === 'playing' && !infoRef.current ? tickGame(g, 0.25 * speed) : g)), 250);
    return () => clearInterval(id);
  }, [running, speed]);

  useEffect(() => {
    if (!game || mode !== 'play') return;
    try {
      if (game.status === 'playing') localStorage.setItem(SAVE_KEY, JSON.stringify({ version: SAVE_VERSION, state: game }));
      else { localStorage.removeItem(SAVE_KEY); setSaved(null); }
    } catch {
      // Restricted browser storage must not interrupt an active mission.
      setSaved(null);
    }
  }, [game, mode]);

  const onMove = useCallback((pos) => {
    setGame((g) => (g && g.status === 'playing' && !g.event && !infoRef.current ? movePlayer(g, pos) : g));
  }, []);
  const doAct = useCallback(() => {
    setGame((g) => {
      if (!g || g.event || infoRef.current) return g;
      const near = getNearby(g);
      const id = near ? near.id : g.sheltered ? 'shelter' : g.rover ? 'rover' : null;
      return id ? interact(g, id) : g;
    });
  }, []);

  useEffect(() => {
    const h = (e) => {
      if (mode !== 'play') return;
      if (infoRef.current) {
        if (['KeyI', 'Escape'].includes(e.code) && !e.repeat) setInfo(null);
        if (!['Tab', 'Enter', 'Space'].includes(e.code)) e.preventDefault();
        return;
      }
      if (e.code === 'KeyI') {
        e.preventDefault();
        if (!e.repeat) openInfo();
        return;
      }
      // Space/Enter on a learning control must not also interact with the world.
      if (e.target instanceof Element && (
        (['Space', 'Enter', 'KeyE'].includes(e.code) && e.target.closest('[data-learning-controls]')) ||
        (['Space', 'Enter'].includes(e.code) && e.target.closest('[data-guidance-controls]'))
      )) return;
      if (e.code === 'Escape' || e.code === 'KeyP') setPaused((p) => !p);
      else if ((e.code === 'KeyE' || e.code === 'Space') && !paused) {
        e.preventDefault();
        if (!e.repeat) doAct();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [mode, paused, doAct, openInfo, setInfo]);

  const start = (d) => { setGame(createGame(d)); targetRef.current = null; setPaused(false); setMode('play'); };
  const toMenu = () => { setPaused(false); setMode('menu'); setSaved(loadSave()); };
  const navigate = (l) => {
    if (!gameRef.current?.event && !infoRef.current) targetRef.current = { x: l.x, z: l.z + 2 };
  };

  const worldGame = useMemo(() => game, [game]);
  const ended = game && game.status !== 'playing';

  return (
    <div className="app" data-testid="app-root">
      <div className="world">
        <World game={mode === 'play' ? worldGame : null} mode={mode === 'play' && !paused && !infoId && !ended && !game?.event ? 'play' : mode === 'menu' ? 'menu' : 'hold'} onMove={onMove} targetRef={targetRef} touchRef={touchRef} />
      </div>
      <div className="vignette" />
      {mode === 'menu' && <Menu onStart={start} hasSave={!!saved} onContinue={() => { setGame(saved); setMode('play'); }} />}
      {mode === 'play' && game && !ended && (
        <>
          <Hud game={game} setGame={setGame} paused={paused} setPaused={setPaused} speed={speed} setSpeed={setSpeed} sound={sound} setSound={setSound} onNavigate={navigate} onMenu={toMenu} onInfo={openInfo} />
          <TouchPad touchRef={touchRef} onAct={doAct} />
          {infoId && <StructureInfo id={infoId} onClose={() => setInfo(null)} />}
        </>
      )}
      {mode === 'play' && ended && <Outcome game={game} setGame={setGame} onReplay={() => start(game.difficulty)} onMenu={() => { localStorage.removeItem(SAVE_KEY); toMenu(); }} />}
      {mode === 'menu' && <footer className="foot">{SCIENCE_SOURCE.label}</footer>}
    </div>
  );
}
