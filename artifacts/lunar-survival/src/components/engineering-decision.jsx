import { getEngineeringNotes } from '../game/engineering-content.js';
import { getDecisionConsequence } from '../game/balance.js';
import { ScienceSource } from './science-notes.jsx';

export default function EngineeringDecision({ event, difficulty, onChoose }) {
  // Look up by ID so older saves receive current educational text without migration.
  const notes = getEngineeringNotes(event.id, difficulty);
  return (
    <div className="modal engineering-dialog" data-testid="modal-event" role="dialog" aria-modal="true" aria-labelledby="engineering-title">
      <div className="eyebrow">Incoming · Commander decision</div>
      <h2 id="engineering-title">{event.title}</h2>
      <p className="engineering-meta">Game time continues while you decide. Costs are simulated meter points, not NASA values; gains stop at 100. A reserve reaching zero ends the mission.</p>
      <section className="engineering-section">
        <h3>THE ENGINEERING PROBLEM</h3>
        <p>{notes?.problem || event.description}</p>
      </section>
      <section className="engineering-section">
        <h3>AVAILABLE SOLUTIONS</h3>
        <div className="choices">
          {event.choices.map((choice) => (
            <button key={choice.id} className="choice" data-testid={`button-choice-${choice.id}`} onClick={() => onChoose(choice.id)}>
              <b>{choice.label}</b>
              <em>{notes?.options[choice.id]?.effects || getDecisionConsequence(choice.id, difficulty) || choice.consequence}</em>
              {notes?.options[choice.id] && <span>{notes.options[choice.id].tradeoff}</span>}
            </button>
          ))}
        </div>
      </section>
      {notes && (
        <>
          <section className="engineering-section">
            <h3>ENGINEERING TRADE-OFF</h3>
            <p>{notes.tradeoff}</p>
          </section>
          <section className="engineering-section">
            <h3>SCIENCE CONNECTION</h3>
            <p>{notes.background} <strong>Takeaway:</strong> {notes.takeaway}</p>
            <details><summary>How the game simplifies this</summary><p>{notes.simplification}</p></details>
          </section>
          <section className="engineering-section">
            <h3>SOURCE</h3>
            <p><ScienceSource source={notes.source} /></p>
          </section>
        </>
      )}
    </div>
  );
}
