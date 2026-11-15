// Integration boundary: simulation data must never be presented as observed NASA data.
export const SCIENCE_SOURCE = {
  mode: 'simulation',
  label: 'Educational simulation · Not live NASA data',
  provider: null,
  attribution: 'Simplified educational model, not an operational spaceflight tool.',
};
export const SCIENCE_FACTS = [
  'The Moon has about one-sixth of Earth’s surface gravity.',
  'The lunar surface has no breathable atmosphere; every EVA needs life support.',
  'Solar particle events can increase radiation exposure. Shielded shelter reduces the dose.',
  'Water ice has been detected in permanently shadowed regions near the lunar poles.',
  'A lunar daylight period lasts roughly two Earth weeks; game time is deliberately compressed.',
  'Regolith can provide radiation shielding, but lunar dust is abrasive and can damage seals.',
];

/**
 * Future server-side DONKI adapter contract. Callers must supply genuinely
 * observed records with source attribution, timestamps and direct source URLs.
 * No fake NASA events are generated if a provider is absent.
 */
export async function getSpaceWeather(provider = null) {
  if (!provider) return { mode: 'simulation', observations: [], source: null, message: 'Live NASA data is not connected.' };
  const response = await provider.getObservations();
  if (!response || !Array.isArray(response.observations) || !response.source) {
    throw new Error('Space weather provider must return attributed observations.');
  }
  return { ...response, mode: 'observed' };
}
