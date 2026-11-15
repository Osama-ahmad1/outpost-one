// Display-only guidance. No forecasts, external data, balance or state changes.
import { getShelterModifierNote } from './balance.js';
export const SHELTER_MODIFIER_NOTE = getShelterModifierNote('normal');
export const SIMULATION_NOTE = 'Simplified game simulation values; no live NASA data or real storm predictions.';

export function getStormEducation(state) {
  const phase = state.storm?.phase || 'quiet';
  const remaining = Math.max(0, Math.ceil(state.storm?.remaining || 0));
  if (phase === 'warning') return `Warning · ${remaining}s remaining. This simulated solar particle event represents energetic particles from the Sun. Prepare for radiation by reaching shelter before the countdown ends.`;
  if (phase === 'active') return `Active · ${remaining}s remaining. Energetic particles pose a radiation risk. ${state.sheltered
    ? 'Sheltered: regolith reduces shield-meter loss; it does not eliminate exposure.'
    : 'Exposed: the shield meter falls much faster outside; enter shelter.'} ${getShelterModifierNote(state.difficulty)}`;
  if (phase === 'passed') return state.systems?.repaired
    ? 'Passed · The simulated event is over and the relay is repaired. Electrical distribution is restored in the game.'
    : 'Passed · The simulated event is over. A scripted power-distribution fault has shut down the array; repairing the relay restores it. This is a game scenario, not a claim that every solar event breaks a relay.';
  return 'Quiet · No scripted solar event is active. Real solar particle events can threaten lunar crews; this game uses a fixed mission sequence, not a forecast.';
}

export function getMissionAction(state) {
  if (state.event) return 'Choose an engineering option the current reserves can afford; movement resumes after the decision.';
  if (state.progress) return 'Stay within the work area until the current task finishes.';
  if (state.storm?.phase === 'active') return state.sheltered
    ? 'Stay sheltered until the all-clear.'
    : state.rover ? 'Drive to the shelter and enter now.' : 'Walk to the shelter and enter now.';
  if (state.storm?.phase === 'warning') return state.sheltered
    ? 'Stay sheltered for the incoming event.'
    : state.rover ? 'Drive to the shelter and enter.' : 'Walk to the shelter and enter.';
  if (state.sheltered && state.stage === 7) return 'Exit the shelter, then walk to the power relay and repair it.';
  if (state.sheltered && state.stage !== 6) return 'Exit the shelter to continue the current objective.';
  switch (state.stage) {
    case 0: return 'Walk to Habitat Alpha and commission it.';
    case 1: return 'Walk to Life Support and repair the oxygen recycler.';
    case 2: return 'Walk to the solar array and connect it.';
    case 3: return 'Walk to the polar deposit and collect ice and cached supplies.';
    case 4:
      if (state.rover) return 'Drive to Shackleton Ridge and start the survey.';
      if (state.resources.energy >= 8 && state.systems.habitat) return 'Walk to the rover, board it, then drive to Shackleton Ridge to survey.';
      return state.systems.solar
        ? 'Wait for the active array to restore at least 8 power before boarding the rover.'
        : 'The rover needs 8 power; no direct recharge task is available at this objective. Avoid unnecessary power costs.';
    case 5: return 'Walk to the shelter and enter.';
    case 6: return state.sheltered ? 'Wait for the all-clear inside shelter.' : 'Return to the shelter while waiting for the all-clear.';
    case 7: return state.rover
      ? 'Exit the rover near the power relay, then repair the relay on foot.'
      : 'Walk to the power relay and repair it.';
    default: return 'Review the mission report.';
  }
}

export function getCriticalResources(state) {
  const systems = state.systems || {};
  const protectedUse = state.sheltered ? ' Shelter slows supply use.' : ' Shelter slows supply use, but stops outside work.';
  const notes = {
    oxygen: `${systems.oxygen ? 'The repaired recycler slows, but does not stop, oxygen use.' : 'Crew breathing drains oxygen; the unrepaired recycler means faster loss.'} Repairing the recycler at objective 2 lowers drain; some decisions spend oxygen.${protectedUse} Real life support generates oxygen and removes carbon dioxide.`,
    energy: `${systems.solar && state.storm?.phase !== 'active'
      ? 'The active array is replenishing power; rover travel and some decisions can still use it.'
      : state.storm?.phase === 'active'
        ? 'The storm pauses solar charging, so base loads drain power.'
        : state.storm?.phase === 'passed' && !systems.repaired
          ? 'The scripted relay fault stops solar charging; base loads drain power.'
          : 'Base loads drain power because the solar array is not online.'} The array at objective 3 or relay repair at objective 8 restores charging. Walking avoids rover power use. Real equipment needs generation, storage and working connections.`,
    water: `Crew use drains water; some engineering choices also spend it. The deposit task at objective 4 adds water once, not continuously.${protectedUse} Real missions must extract and process ice; this game does not model plumbing or water recycling.`,
    food: `The crew consumes stored food; power rationing can spend extra food. Cached supplies at objective 4 add food once; collecting ice does not create it.${protectedUse} Real crews need resupply and planned nutrition; there is no food-production system here.`,
    shield: `${state.storm?.phase === 'active'
      ? state.sheltered ? 'Radiation is slowly reducing the shield meter even in shelter.' : 'Radiation is rapidly reducing the shield meter while exposed.'
      : 'The shield meter is not falling from radiation now; this is a low remaining reserve.'} Regolith shelter reduces loss during an active event; leaving it increases loss. No shield-repair action exists. This meter is not a real radiation dose. ${getShelterModifierNote(state.difficulty)}`,
  };
  return Object.entries(state.resources)
    .filter(([id, value]) => id in notes && value < 20)
    .sort((a, b) => a[1] - b[1])
    .map(([id, value]) => ({ id, value, explanation: notes[id] }));
}

export function getFlightAdvisor(state) {
  if (state.status === 'won') return 'The outpost is secured. Review the report: reserve levels and decision effects show how power and life support kept the crew alive.';
  if (state.status === 'lost') return 'An essential reserve failed. Review its cause in the report, then replay; lunar crews depend on limited life-support supplies.';
  const action = getMissionAction(state);
  if (state.event) return `An engineering fault needs a decision; time and life-support use continue. ${action} Compare oxygen, power, water and food costs: spacecraft systems share limited supplies.`;
  if (state.storm?.phase === 'active') return `${state.sheltered ? 'Shelter slows shield loss, but exposure is not zero.' : 'Exposed radiation is draining shield protection.'} ${action} Regolith adds shielding mass between the crew and particles.`;
  if (state.storm?.phase === 'warning') return `Radiation risk begins in ${Math.max(0, Math.ceil(state.storm.remaining))} simulated seconds. ${action} Protect the shield reserve: energetic solar particles can harm lunar crews.`;
  const low = getCriticalResources(state)[0];
  if (low) {
    const cause = {
      oxygen: 'Crew breathing consumes oxygen; life-support recycling reduces resupply needs.',
      energy: state.systems.solar && state.storm?.phase !== 'active'
        ? 'The array is charging, but travel and decisions can use power; real equipment needs reliable electricity.'
        : 'Without solar charging, base loads use stored power; real electrical systems need generation and storage.',
      water: 'Crew use and some decisions consume water; real lunar ice needs extraction and processing.',
      food: 'Crew use and some decisions consume stored food; ice is not a food source.',
      shield: 'This meter represents radiation protection, not a real dose; material shielding reduces particle exposure.',
    }[low.id];
    return `${low.id.toUpperCase()} is critical (${Math.round(low.value)} game points); zero ends the mission. ${action} ${cause}`;
  }
  const reasons = [
    'Breathable air needs a pressure vessel; the Moon has no usable atmosphere. This commissions the habitat, not a supply refill.',
    'Breathing uses oxygen; repaired life support lowers oxygen drain because recycling reduces resupply needs.',
    'Life support needs power; solar cells turn sunlight into electricity and restore charging.',
    'Water and food reserves are finite; polar ice needs processing, while food comes from cached supplies.',
    'Rover travel spends power to extend exploration range; instruments enable the survey.',
    'The shield reserve needs protection; regolith supplies mass that reduces particle exposure.',
    'The shield reserve still falls during exposure; shelter reduces radiation loss, not radiation itself.',
    'The scripted relay fault stops power charging; electrical networks need intact distribution paths.',
  ];
  return `${action} ${reasons[state.stage] || 'Monitor the remaining reserves.'}`;
}
