import { useEffect, useRef, useState } from 'react';
import { MISSIONS } from '../game/engine.js';
import { MISSION_LEARNING, normalizeLearning } from '../game/mission-learning.js';
import { ScienceSource } from './science-notes.jsx';
import './mission-learning.css';

const titleOf = (id) => MISSIONS.find(m => m.id === id)?.title || id;
const isInteractive = (t) => t && t.closest && t.closest('button, select, a, input, summary');

function Question({ id, response, onAnswer }) {
  const q = MISSION_LEARNING[id]?.question;
  if (!q) return null;
  return (
    <div className="ml-q" data-testid="knowledge-question">
      <p className="ml-q-prompt">{q.prompt} <span className="ml-opt">Optional</span></p>
      {!response && (
        <div className="ml-opts">
          {q.options.map((o, i) => (
            <button key={i} type="button" className="ml-btn" data-testid={`knowledge-option-${i}`} onClick={() => onAnswer?.(id, i)}>{o}</button>
          ))}
          <button type="button" className="ml-btn ml-skip" data-testid="knowledge-skip" onClick={() => onAnswer?.(id, null)}>Skip</button>
        </div>
      )}
      {response && (
        <p className={`ml-fb ${response.skipped ? 'skip' : response.correct ? 'ok' : 'no'}`} data-testid="knowledge-feedback" role="status">
          {response.skipped ? <>Skipped. Answer: <b>{q.options[q.correct]}</b>. </>
            : response.correct ? <><b>Correct.</b> </>
            : <><b>Not quite.</b> Correct answer: <b>{q.options[q.correct]}</b>. </>}
          {q.explanation}
        </p>
      )}
    </div>
  );
}

export default function MissionLearning({ game, onAnswer }) {
  const completed = game?.completed || [];
  const stageId = typeof game?.stage === 'number' ? MISSIONS[game.stage]?.id : (game?.stage?.id || game?.stage);
  const current = MISSION_LEARNING[stageId] ? stageId : null;
  const latest = completed[completed.length - 1] || null;
  const learning = normalizeLearning(game?.learning);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(null);
  const prevLatest = useRef(latest);
  useEffect(() => {
    if (prevLatest.current !== latest) { prevLatest.current = latest; setPicked(null); }
  }, [latest]);
  const selected = picked && completed.includes(picked) ? picked : latest;
  const sel = selected ? MISSION_LEARNING[selected] : null;
  const questionCount = Object.values(MISSION_LEARNING).filter(m => m.question).length;

  const onKey = (e) => {
    // Keep activation keys local, but let WASD reach the world even after a
    // learning button receives focus. Keyup must bubble to clear held keys.
    const selecting = e.target.closest?.('select');
    if (isInteractive(e.target) && (
      ['Space', 'Enter', 'KeyE'].includes(e.code) ||
      (selecting && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    )) e.stopPropagation();
  };

  return (
    <div className="ml" data-learning-controls onKeyDownCapture={onKey}>
      {latest && (
        <p className="ml-done" data-testid="learning-completion" aria-live="polite">
          <b>Learned:</b> {MISSION_LEARNING[latest]?.takeaway}
        </p>
      )}
      <button type="button" className="ml-toggle" data-testid="learning-toggle" aria-expanded={open} onClick={() => setOpen(o => !o)}>
        <span>{open ? '−' : '+'} Learn the science</span>
        <span className="ml-count" data-testid="knowledge-stats">{learning.correct}/{learning.answered} correct · {questionCount} quiz</span>
      </button>
      {open && (
        <div className="ml-body">
          {current && !completed.includes(current) && (
            <section data-testid="learning-current">
              <h4>Now · {titleOf(current)}</h4>
              <p>{MISSION_LEARNING[current].science}</p>
              <p className="ml-src" data-testid={`learning-source-${current}`}><ScienceSource source={MISSION_LEARNING[current].source} /></p>
            </section>
          )}
          {completed.length > 0 ? (
            <section>
              <label className="ml-lab">Review
                <select data-testid="learning-select" value={selected || ''} onChange={e => setPicked(e.target.value)}>
                  {completed.map((id, i) => <option key={id} value={id}>{i + 1}. {titleOf(id)}</option>)}
                </select>
              </label>
              {sel && (
                <div className="ml-card" data-testid={`learning-card-${selected}`}>
                  <p>{sel.science}</p>
                  <p><b>Takeaway:</b> {sel.takeaway}</p>
                  <p className="ml-src" data-testid={`learning-source-${selected}`}><ScienceSource source={sel.source} /></p>
                  <Question id={selected} response={learning.responses[selected]} onAnswer={onAnswer} />
                </div>
              )}
            </section>
          ) : <p className="ml-empty">Complete an objective to unlock its learning card.</p>}
          <p className="ml-note">Optional: no XP or resource effects. Game time continues while you read; use Pause to stop it.</p>
        </div>
      )}
    </div>
  );
}
