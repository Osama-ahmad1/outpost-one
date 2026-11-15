import { LOCATIONS } from './engine.js';
import { SCIENCE_TOPICS } from './science-content.js';

const topicIds = {
  habitat: 'life-support', oxygen: 'life-support', solar: 'solar', ice: 'ice',
  rover: 'rover', survey: 'gravity', shelter: 'shielding', repair: 'relay',
};

// Read-only educational content. No simulation or persisted state is added.
export const STRUCTURE_INFO = Object.fromEntries(LOCATIONS.map(location => {
  const topic = SCIENCE_TOPICS.find(item => item.id === topicIds[location.id]);
  const simplification = location.id === 'habitat'
    ? 'Commissioning the habitat is a short task; gas chemistry, pressure and filters are not modeled.'
    : topic.simplification.replace(/\. ([A-Z])/g, (_, letter) => `; ${letter.toLowerCase()}`);
  return [location.id, {
    id: location.id, name: location.name, inGame: location.description,
    realLife: topic.explanation, simplification, source: topic.source,
  }];
}));
