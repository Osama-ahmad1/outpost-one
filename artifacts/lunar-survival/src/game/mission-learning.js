import { NASA_SOURCES } from './science-content.js';

// Educational metadata only. These values never affect the survival simulation.
export const MISSION_LEARNING = {
  habitat: {
    science: 'The Moon has almost no atmosphere. A sealed habitat must provide breathable air and safe pressure.',
    takeaway: 'A habitat is a small, protected environment that keeps people alive where they cannot breathe outside.',
    source: NASA_SOURCES.lifeSupport,
  },
  oxygen: {
    science: 'Life-support equipment can split water to make oxygen and remove carbon dioxide from cabin air.',
    takeaway: 'Recycling reduces resupply needs, but real life support needs several connected systems, not one repair.',
    source: NASA_SOURCES.lifeSupport,
    question: {
      prompt: 'What can life-support equipment split to make oxygen?',
      options: ['Moon rocks without processing', 'Water', 'Sunlight'],
      correct: 1,
      explanation: 'Electrolysis splits water into oxygen and hydrogen. Removing carbon dioxide is another important life-support job.',
    },
  },
  solar: {
    science: 'Solar cells turn sunlight into electricity. Shadows mean a lunar base also needs storage or another power supply.',
    takeaway: 'Reliable power means planning for times when panels cannot receive sunlight.',
    source: NASA_SOURCES.power,
    question: {
      prompt: 'Why does a solar-powered Moon base need stored energy?',
      options: ['Panels may be in shadow', 'Moonlight is always stronger', 'Batteries create sunlight'],
      correct: 0,
      explanation: 'Solar panels need sunlight. Stored energy can keep equipment running when panels are in shadow.',
    },
  },
  ice: {
    science: 'Water ice exists in some permanently shadowed polar regions. Finding it is only the first step toward using it.',
    takeaway: 'Real lunar water must be extracted and processed. This game also awards cached food; ice does not make food.',
    source: NASA_SOURCES.ice,
    question: {
      prompt: 'Where can water ice survive near the Moon’s poles?',
      options: ['Every sunny surface', 'Inside sunlight', 'Some permanently shadowed regions'],
      correct: 2,
      explanation: 'Some polar regions never receive direct sunlight and are cold enough for water ice to persist.',
    },
  },
  survey: {
    science: 'Rovers extend exploration range, but routes must account for terrain, energy and equipment temperatures.',
    takeaway: 'A rover helps crews travel farther, but they must still plan a safe return trip.',
    source: NASA_SOURCES.rover,
  },
  shelter: {
    science: 'Solar particle events can expose astronauts to harmful radiation. Material around a shelter provides protection.',
    takeaway: 'Reaching shelter reduces exposure. The game’s countdown and shielding percentage are simulated, not NASA forecasts.',
    source: NASA_SOURCES.radiation,
  },
  survive: {
    science: 'Regolith adds shielding mass between astronauts and radiation. Real protection depends on thickness and particle energy.',
    takeaway: 'Protection is about reducing radiation exposure, not making radiation disappear. Real crews follow monitoring and safety procedures.',
    source: NASA_SOURCES.radiation,
    question: {
      prompt: 'How can regolith around a shelter help astronauts?',
      options: ['It turns radiation into air', 'It adds material that reduces radiation exposure', 'It stops the Sun from erupting'],
      correct: 1,
      explanation: 'Shielding material can reduce exposure. It does not stop a solar eruption or guarantee complete protection.',
    },
  },
  repair: {
    science: 'A power network must transfer electricity reliably from generators and storage to the equipment that needs it.',
    takeaway: 'Generating electricity is not enough: connections and distribution must work too. This relay repair is a simplified task.',
    source: NASA_SOURCES.power,
  },
};

// Keep the existing save key and envelope version. Older version-2 saves simply
// gain an empty education record; completed missions remain reviewable.
export function normalizeLearning(value) {
  const responses = {};
  for (const [id, response] of Object.entries(value?.responses || {})) {
    const question = MISSION_LEARNING[id]?.question;
    if (!question) continue;
    if (response?.skipped === true) responses[id] = { skipped: true };
    else if (Number.isInteger(response?.answer) && response.answer >= 0 && response.answer < question.options.length) {
      responses[id] = { answer: response.answer, correct: response.answer === question.correct };
    }
  }
  const answered = Object.values(responses).filter(response => !response.skipped);
  return { responses, answered: answered.length, correct: answered.filter(response => response.correct).length };
}

export function respondToQuestion(state, id, answer) {
  const question = MISSION_LEARNING[id]?.question;
  const learning = normalizeLearning(state.learning);
  if (!question || !state.completed.includes(id) || learning.responses[id]) return state;
  if (answer !== null && (!Number.isInteger(answer) || answer < 0 || answer >= question.options.length)) return state;
  return {
    ...state,
    learning: normalizeLearning({
      responses: { ...learning.responses, [id]: answer === null ? { skipped: true } : { answer } },
    }),
  };
}
