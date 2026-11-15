import { useEffect, useRef } from 'react';
import { STRUCTURE_INFO } from '../game/structure-info.js';
import './structure-info.css';

const drawings = {
  habitat: 'M12 40V22Q32 0 52 22V40ZM27 40V26H37V40',
  oxygen: 'M16 40V12Q22 6 28 12V40ZM36 40V12Q42 6 48 12V40M16 20H28M36 20H48',
  solar: 'M8 10H52L58 30H14ZM20 10L25 30M34 10L39 30M10 20H55M32 30V42M22 42H42',
  ice: 'M10 40L20 16L28 26L38 8L54 40ZM38 8V30M20 16L24 34',
  rover: 'M12 32V20H42L52 32ZM30 20V10H42M20 32A6 6 0 1 0 20 44A6 6 0 1 0 20 32M46 32A6 6 0 1 0 46 44A6 6 0 1 0 46 32',
  survey: 'M6 42L20 30L30 36L48 18L58 42M38 30V8M30 8Q38 24 46 8ZM32 42H44',
  shelter: 'M6 40Q8 4 32 4Q56 4 58 40ZM26 40V26H38V40M12 36Q16 12 32 12Q48 12 52 36',
  repair: 'M20 42V8H44V42ZM26 16H38M26 24H38M26 32H38M8 36H20M44 36H56',
};

export default function StructureInfo({ id, onClose }) {
  const closeRef = useRef(null);
  const entry = STRUCTURE_INFO[id];
  useEffect(() => {
    const previous = document.activeElement;
    closeRef.current?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  if (!entry) return null;
  return (
    <div className="structure-info-layer" onPointerDown={e => e.stopPropagation()}>
      <section className="structure-info-card" role="dialog" aria-modal="true" aria-labelledby="structure-info-title" data-testid="structure-info-card"
        onKeyDown={e => {
          if (e.key !== 'Tab') return;
          const elements = e.currentTarget.querySelectorAll('button, a[href]');
          const first = elements[0], last = elements[elements.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }}>
        <header>
          <h3 id="structure-info-title">{entry.name}</h3>
          <button ref={closeRef} className="ibtn" onClick={onClose} aria-label="Close structure info">Close ×</button>
        </header>
        <p className="structure-info-paused">Game paused while you read</p>
        <svg viewBox="0 0 64 48" width="80" height="60" aria-hidden="true"><path d={drawings[id]} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
        <h4>In the game</h4><p>{entry.inGame}</p>
        <h4>In real life</h4><p>{entry.realLife}</p>
        <h4>How the game simplifies it</h4><p>{entry.simplification}</p>
        <h4>NASA source</h4>
        {entry.source ? <a href={entry.source.url} target="_blank" rel="noopener noreferrer">{entry.source.title}</a> : <p>No source linked</p>}
        <p className="structure-info-disclaimer">Educational simulation, not live NASA data</p>
      </section>
    </div>
  );
}
