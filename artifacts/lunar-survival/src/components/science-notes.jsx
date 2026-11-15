import { SCIENCE_TOPICS } from '../game/science-content.js';

export function ScienceSource({ source }) {
  if (!source || source.status !== 'verified') return <span>Source needs verification.</span>;
  return (
    <span>
      <a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
      {' · '}{source.organization}
    </span>
  );
}

export default function ScienceNotes() {
  return (
    <details className="science-notes" data-testid="science-notes">
      <summary>Science notes &amp; NASA sources · 10 topics</summary>
      <p>Real science informs the setting. All resource points, event costs, task times and the storm sequence are simulated, not NASA measurements or live data.</p>
      {SCIENCE_TOPICS.map((topic) => (
        <details key={topic.id} data-testid={`science-topic-${topic.id}`}>
          <summary>{topic.title}</summary>
          <p><strong>Real science:</strong> {topic.explanation}</p>
          <p><strong>Why it matters:</strong> {topic.missionRelevance}</p>
          <p><strong>How the game simplifies this:</strong> {topic.simplification}</p>
          <p><strong>Source:</strong> <ScienceSource source={topic.source} /></p>
          {topic.archivedReference && (
            <div data-testid="archived-nasa-reference">
              <p><strong>{topic.archivedReference.title}</strong></p>
              <p>{topic.archivedReference.date} · {topic.archivedReference.type} {topic.archivedReference.classification} · Start {topic.archivedReference.startTime} · Peak {topic.archivedReference.peakTime}</p>
              <p>Event ID: {topic.archivedReference.eventId}</p>
              <p>{topic.archivedReference.disclaimer}</p>
              {topic.archivedReference.verificationStatus !== 'verified' && (
                <p data-testid="archived-nasa-verification">{topic.archivedReference.verificationNote}</p>
              )}
              <p>{topic.archivedReference.articleTitle}</p>
              <p><a href={topic.archivedReference.url} target="_blank" rel="noopener noreferrer">View NASA article</a>{' · '}<a href={topic.archivedReference.donkiUrl} target="_blank" rel="noopener noreferrer">DONKI record</a></p>
            </div>
          )}
        </details>
      ))}
    </details>
  );
}
