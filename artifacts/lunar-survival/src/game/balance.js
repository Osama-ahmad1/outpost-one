// Runtime configuration only: difficulty remains the sole saved balance selector.
const DIFFICULTIES = {
  easy: { drain: 0.65, warning: 65, radiation: 0.8, shelterLoss: 0.02, eventBase: 80, eventRange: 50 },
  normal: { drain: 1, warning: 45, radiation: 1.4, shelterLoss: 0.02, eventBase: 80, eventRange: 50 },
  hard: { drain: 1.75, warning: 30, radiation: 3.5, shelterLoss: 0.07, eventBase: 60, eventRange: 41 },
};
const EFFECTS = {
  clean: { energy: -6, oxygen: 3 }, ration: { energy: 4, food: -5 },
  seal: { water: -5, energy: -3 }, vent: { oxygen: -8, energy: 4 },
  heat: { energy: -7 }, cycle: { water: -3, oxygen: -3, energy: 3 },
};

export function getDifficulty(difficulty) {
  return DIFFICULTIES[difficulty] || DIFFICULTIES.normal;
}

export function getShelterProtection(difficulty) {
  return 100 - Math.round(getDifficulty(difficulty).shelterLoss * 100);
}

export function getShelterModifierNote(difficulty) {
  return `${getShelterProtection(difficulty)}% is a simulated protection modifier, not a real shelter performance figure.`;
}

export function getDecisionEffects(choiceId, difficulty) {
  return Object.fromEntries(Object.entries(EFFECTS[choiceId] || {}).map(([key, value]) => [
    key, difficulty === 'hard' && value < 0 ? -Math.round(-value * 1.3) : value,
  ]));
}

export function getDecisionConsequence(choiceId, difficulty) {
  const effects = getDecisionEffects(choiceId, difficulty);
  switch (choiceId) {
    case 'clean': return `Spend ${-effects.energy} energy; clear the dust and recover 3 oxygen.`;
    case 'ration': return `Save 4 energy; crew uses ${-effects.food} extra food.`;
    case 'seal': return `Spend ${-effects.water} water and ${-effects.energy} energy; protect oxygen reserves.`;
    case 'vent': return `Spend ${-effects.oxygen} oxygen; recover 4 energy.`;
    case 'heat': return `Spend ${-effects.energy} energy; preserve all supplies.`;
    case 'cycle': return `Spend ${-effects.water} water and ${-effects.oxygen} oxygen; gain 3 energy.`;
    default: return '';
  }
}
