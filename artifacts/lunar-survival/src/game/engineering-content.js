import { NASA_SOURCES } from './science-content.js';
import { getDecisionConsequence } from './balance.js';

// Presentation metadata lives outside saved events; old saves use current difficulty costs.
export const ENGINEERING_NOTES = {
  dust: {
    problem: 'Dust on the array threatens useful sunlight collection. Choose what the outpost can afford to spend now.',
    background: 'NASA studies electric fields that lift dust off solar panels and other surfaces.',
    tradeoff: 'Cleaning spends power to conserve breathing reserves; rationing protects power by spending food. Neither preserves every reserve.',
    takeaway: 'Dust mitigation and load management compete for limited resources.',
    simplification: 'No ongoing dust penalty is calculated. The oxygen bonus is a game abstraction, not a physical result of cleaning.',
    source: NASA_SOURCES.dust,
    options: {
      clean: { effects: 'Cost: 6 power. Effect: +3 oxygen.', tradeoff: 'Use scarce power now to support the oxygen reserve.' },
      ration: { effects: 'Cost: 5 food. Effect: +4 power.', tradeoff: 'Keep power available at the expense of crew supplies.' },
    },
  },
  leak: {
    problem: 'A simulated seal leak threatens a secondary cooling loop. Choose between spending repair supplies and accepting an operational loss.',
    background: 'Spacecraft thermal systems move heat from equipment to radiators; pumped fluid loops are one approach.',
    tradeoff: 'Patching spends water and power to keep oxygen intact; venting spends oxygen for a power credit. Compare the reserves you have left.',
    takeaway: 'Thermal faults can force decisions across several connected subsystems.',
    simplification: 'The water, oxygen and power exchange is fictional. No coolant chemistry, leak rate, heat buildup or extra oxygen protection is calculated.',
    source: NASA_SOURCES.thermal,
    options: {
      seal: { effects: 'Cost: 5 water and 3 power. Effect: oxygen unchanged by this choice.', tradeoff: 'Preserve oxygen, but consume two other reserves.' },
      vent: { effects: 'Cost: 8 oxygen. Effect: +4 power.', tradeoff: 'Keep water and gain power, but reduce breathing reserves.' },
    },
  },
  battery: {
    problem: 'Battery heating is using more power than planned. Decide which reserves should support thermal management.',
    background: 'NASA lunar-vehicle studies identify battery temperature limits as an important driver of heater power and insulation design.',
    tradeoff: 'Heating spends power without using food, water or oxygen; cycling gains power but spends both water and oxygen. The better choice depends on your reserves.',
    takeaway: 'Thermal control is part of the power budget, not a free background service.',
    simplification: 'No temperature or delayed damage is calculated. Cycling’s power gain and supply costs are game abstractions, not a real operating procedure.',
    source: NASA_SOURCES.rover,
    options: {
      heat: { effects: 'Cost: 7 power. Effect: other resource meters unchanged by this choice.', tradeoff: 'Conserve water and oxygen at the expense of power.' },
      cycle: { effects: 'Cost: 3 water and 3 oxygen. Effect: +3 power.', tradeoff: 'Recover power, but use two life-support reserves.' },
    },
  },
};

export function getEngineeringNotes(eventId, difficulty) {
  const notes = ENGINEERING_NOTES[eventId];
  if (!notes || difficulty !== 'hard') return notes;
  return {
    ...notes,
    options: Object.fromEntries(Object.entries(notes.options).map(([id, option]) => [
      id, { ...option, effects: getDecisionConsequence(id, difficulty) },
    ])),
  };
}
