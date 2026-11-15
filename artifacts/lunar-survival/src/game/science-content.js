// Verified NASA references support the concepts, not the game's invented meter values.
export const NASA_SOURCES = {
  moon: {
    title: 'Moon Facts', organization: 'NASA Science',
    url: 'https://science.nasa.gov/moon/facts', status: 'verified',
  },
  lifeSupport: {
    title: 'Environmental Control and Life Support Systems (ECLSS)', organization: 'NASA Marshall Space Flight Center',
    url: 'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/', status: 'verified',
  },
  power: {
    title: 'Integrated Lunar Power Strategy Considerations', organization: 'NASA · NASA Technical Reports Server',
    url: 'https://ntrs.nasa.gov/api/citations/20250010948/downloads/ACR25%20-%20WP%20-%20Lunar%20Power%20Strategy.pdf', status: 'verified',
  },
  ice: {
    title: 'Water & Ices on the Moon', organization: 'NASA Science',
    url: 'https://science.nasa.gov/moon/moon-water-and-ices', status: 'verified',
  },
  rover: {
    title: 'Designing a Lunar Terrain Vehicle: Thermal Challenges', organization: 'NASA Johnson Space Center · NASA Technical Reports Server',
    url: 'https://ntrs.nasa.gov/api/citations/20230002802/downloads/LTV_Thermal_Challenges__TFAWS.pdf', status: 'verified',
  },
  radiation: {
    title: 'How NASA Will Protect Astronauts From Space Radiation at the Moon', organization: 'NASA Science',
    url: 'https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon', status: 'verified',
  },
  dust: {
    title: 'NASA Technology Helps Guard Against Lunar Dust', organization: 'NASA Kennedy Space Center',
    url: 'https://www.nasa.gov/centers-and-facilities/kennedy/nasa-technology-helps-guard-against-lunar-dust', status: 'verified',
  },
  thermal: {
    title: '7.0 Thermal Control', organization: 'NASA Small Spacecraft Systems Virtual Institute',
    url: 'https://www.nasa.gov/smallsat-institute/sst-soa/thermal-control/', status: 'verified',
  },
};

export const SCIENCE_TOPICS = [
  {
    id: 'gravity', title: 'Lunar gravity and surface', source: NASA_SOURCES.moon,
    explanation: 'Surface gravity is about one-sixth of Earth’s. Craters, rocks and loose regolith shape the terrain.',
    missionRelevance: 'Crews and vehicles need stable footing, careful routes and equipment designed for low gravity.',
    simplification: 'Movement speeds and the generated terrain are designed for play; this is not a gravity, traction or collision simulator.',
  },
  {
    id: 'life-support', title: 'Life support and oxygen recycling', source: NASA_SOURCES.lifeSupport,
    explanation: 'Life-support systems remove carbon dioxide, recover water and generate oxygen by splitting water. NASA’s ECLSS reference describes space-station technology.',
    missionRelevance: 'A lunar habitat must maintain breathable air without a breathable atmosphere outside, while limiting resupply.',
    simplification: 'One repair lowers a single oxygen meter’s drain. Gas chemistry, pressure, filters and separate water-to-oxygen flows are not modeled.',
  },
  {
    id: 'solar', title: 'Solar power', source: NASA_SOURCES.power,
    explanation: 'Solar cells convert sunlight into electricity. Polar terrain creates changing shadows, so storage or other generation is needed.',
    missionRelevance: 'Life support, instruments and vehicle charging need reliable power even when sunlight is unavailable.',
    simplification: 'An active array adds a fixed amount to one power meter. Sun angles, efficiencies and day/night cycles are omitted; storm shutdown is scripted.',
  },
  {
    id: 'ice', title: 'Polar water ice', source: NASA_SOURCES.ice,
    explanation: 'Observations confirm water ice in permanently shadowed polar regions. Deposits are not uniformly distributed or automatically accessible.',
    missionRelevance: 'Usable local water could support crews and potentially oxygen or propellant production, after extraction and processing.',
    simplification: 'A short collection task grants water and cached food supplies. Ice does not create food; drilling, purification and transport costs are compressed.',
  },
  {
    id: 'rover', title: 'Lunar rover', source: NASA_SOURCES.rover,
    explanation: 'Lunar vehicles extend exploration range, but batteries, terrain and thermal limits constrain their operation. The NASA source discusses a vehicle design concept.',
    missionRelevance: 'Rovers can carry crew and instruments farther than walking, but return journeys must fit power and safety limits.',
    simplification: 'The rover shares the outpost power meter and moves at a fixed speed. There is no wheel-slip, suspension, communications or separate battery model.',
  },
  {
    id: 'radiation', title: 'Solar particle events and radiation', source: NASA_SOURCES.radiation,
    explanation: 'Solar eruptions can accelerate energetic particles. The Moon lacks Earth’s atmospheric and global magnetic protection, and forecasting remains uncertain.',
    missionRelevance: 'Crews need monitoring, shelter plans and limits on exposure during surface operations.',
    simplification: 'A scripted countdown and one shield meter replace uncertain forecasts and radiation dose calculations. No live NASA observations are used.',
    archivedReference: {
      title: 'Archived real observation - NASA DONKI',
      eventId: '2024-05-14T02:03:00-FLR-001',
      date: '14 May 2024',
      type: 'Solar flare',
      classification: 'X1.7',
      startTime: '02:03 UTC',
      peakTime: '02:09 UTC',
      articleTitle: 'Sun Releases 2 Strong Solar Flares',
      url: 'https://science.nasa.gov/blogs/solar-cycle-25/2024/05/14/sun-releases-2-strong-solar-flares/',
      donkiUrl: 'https://webtools.ccmc.gsfc.nasa.gov/DONKI/view/FLR/30832/3',
      verificationStatus: 'needs_verification',
      verificationNote: 'Flare confirmed in the NASA Science article; the DONKI server can be slow or unavailable.',
      disclaimer: "Historical reference only. Not live data or a forecast. This is a solar flare record, not a solar particle measurement. The game's storm timing, radiation damage and shelter protection are simulated.",
    },
  },
  {
    id: 'shielding', title: 'Regolith shielding', source: NASA_SOURCES.radiation,
    explanation: 'Regolith placed over a shelter adds mass between the crew and incoming radiation. Protection depends on material, thickness and particle energy.',
    missionRelevance: 'Using local material may reduce the shielding mass that must be launched from Earth.',
    simplification: 'Shelter reduces shield-meter loss by 98% on Easy/Normal and 93% on Hard. Each is a simulated protection modifier, not a real shelter performance figure or dose estimate.',
  },
  {
    id: 'relay', title: 'Power relay and electrical systems', source: NASA_SOURCES.power,
    explanation: 'A lunar power network must generate, store and transfer electricity to distributed users through reliable connections and controls.',
    missionRelevance: 'A distribution fault can interrupt power to essential equipment even when a generator still works.',
    simplification: 'The relay is a fictional single repair task. There is no circuit, voltage, fault-isolation or redundancy simulation; storm damage is scripted.',
  },
  {
    id: 'thermal', title: 'Thermal control and batteries', source: NASA_SOURCES.rover,
    explanation: 'Batteries and electronics have temperature limits. Insulation, heaters, radiators and thermal design help keep components within them.',
    missionRelevance: 'Lunar cold and heat can threaten both stored energy and equipment survival; heating also consumes power.',
    simplification: 'A decision applies immediate meter changes. Battery temperature, heater duty cycles, degradation and long-term thermal risks are not simulated.',
  },
  {
    id: 'dust', title: 'Lunar dust', source: NASA_SOURCES.dust,
    explanation: 'Fine, abrasive lunar dust can cling to surfaces, interfere with seals and cover solar panels or radiators. NASA studies electric-field dust removal.',
    missionRelevance: 'Keeping equipment clean protects power generation, heat rejection, visibility and habitat interfaces.',
    simplification: 'Dust is a one-time engineering decision, not persistent contamination. Cleaning’s oxygen bonus and every cost are invented game values.',
  },
];
