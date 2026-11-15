# Science and NASA sources

Source of truth: `game/science-content.js`. Open in the game via **Menu → Mission Briefing → Science notes & NASA sources → topic**.

The registry currently marks eight source objects `verified`. That is the stored project status, **not a claim of a fresh online verification for this documentation**. Ten topics reuse these references. The thermal-control topic currently uses the rover thermal paper; a separate general thermal-control source is also present in the registry.

## Ten topics

| Topic | Scientific idea and game simplification | NASA source |
|---|---|---|
| Lunar gravity and surface | Gravity is about one-sixth of Earth's; regolith and craters affect travel. Terrain and speeds are designed for play, not a gravity or traction simulation. | **Moon Facts**, NASA Science: https://science.nasa.gov/moon/facts |
| Life support and oxygen recycling | Real life support handles gases and water. One recycler repair reduces an O2 meter's drain; chemistry and pressure are not modeled. | **Environmental Control and Life Support Systems (ECLSS)**, NASA Marshall Space Flight Center: https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/ |
| Solar power | Sunlight can generate electricity; shadows create supply challenges. The game uses fixed generation and scripted storm shutdown, without sun-angle or day/night calculations. | **Integrated Lunar Power Strategy Considerations**, NASA / NTRS: https://ntrs.nasa.gov/api/citations/20250010948/downloads/ACR25%20-%20WP%20-%20Lunar%20Power%20Strategy.pdf |
| Polar water ice | Ice exists in some permanently shadowed polar areas. A short task grants water and cached food; extraction and processing are compressed. | **Water & Ices on the Moon**, NASA Science: https://science.nasa.gov/moon/moon-water-and-ices |
| Lunar rover | Rovers extend exploration range, with power and thermal limits. The game shares outpost energy and uses a fixed speed, without wheel-slip or separate battery modeling. | **Designing a Lunar Terrain Vehicle: Thermal Challenges**, NASA Johnson Space Center / NTRS: https://ntrs.nasa.gov/api/citations/20230002802/downloads/LTV_Thermal_Challenges__TFAWS.pdf |
| Solar particle events and radiation | Energetic solar particles can threaten lunar crews. Scripted countdown and shield points replace forecasts and dose calculations. | **How NASA Will Protect Astronauts From Space Radiation at the Moon**, NASA Science: https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon |
| Regolith shielding | Material can reduce radiation exposure; thickness and particle energy matter. Shelter applies a difficulty-specific game modifier, not calculated dose shielding. | **How NASA Will Protect Astronauts From Space Radiation at the Moon**, NASA Science: https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon |
| Power relay and electrical systems | Power must be distributed reliably. The game has one fictional relay task, without voltage, circuit or redundancy modeling. | **Integrated Lunar Power Strategy Considerations**, NASA / NTRS: https://ntrs.nasa.gov/api/citations/20250010948/downloads/ACR25%20-%20WP%20-%20Lunar%20Power%20Strategy.pdf |
| Thermal control and batteries | Equipment needs suitable temperatures, insulation, heaters and radiators. Events change meters immediately; temperature and degradation are not tracked. | **Designing a Lunar Terrain Vehicle: Thermal Challenges**, NASA Johnson Space Center / NTRS: https://ntrs.nasa.gov/api/citations/20230002802/downloads/LTV_Thermal_Challenges__TFAWS.pdf |
| Lunar dust | Abrasive dust can interfere with equipment. The dust event is one decision, not persistent contamination; costs and cleaning's O2 gain are invented game values. | **NASA Technology Helps Guard Against Lunar Dust**, NASA Kennedy Space Center: https://www.nasa.gov/centers-and-facilities/kennedy/nasa-technology-helps-guard-against-lunar-dust |

Additional registry source: **7.0 Thermal Control**, NASA Small Spacecraft Systems Virtual Institute: https://www.nasa.gov/smallsat-institute/sst-soa/thermal-control/

These references support concepts, not the accuracy of resource numbers or every fictional event consequence. There is no claim of NASA endorsement.

## Archived DONKI reference

The radiation topic contains:

| Field | Stored value |
|---|---|
| Heading | Archived real observation - NASA DONKI |
| Event ID | `2024-05-14T02:03:00-FLR-001` |
| Date | 14 May 2024 |
| Type / classification | Solar flare / X1.7 |
| Start / peak | 02:03 UTC / 02:09 UTC |
| URL | https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/FLR/30832/3 |
| Verification status | `needs_verification` |

Stored note: “Source details need direct verification. The official record could not be retrieved during verification.”

These are the project's **stored metadata**, not a new independent confirmation. This entry is outside `NASA_SOURCES`, so the registry availability-check command does not check it.

The game displays this exact distinction:

> Historical reference only. Not live data or a forecast. This is a solar flare record, not a solar particle measurement. The game's storm timing, radiation damage and shelter protection are simulated.

## Scientific honesty

- The current attribution is “Educational simulation · Not live NASA data”.
- No live space-weather provider is connected.
- `science.js` has an optional provider interface, not an operational DONKI integration.
- Task times, event costs, map distances, meter points and storm sequence are invented for play.
- Shelter uses 98% on Easy/Normal and 93% on Hard: each is a **simulated protection modifier, not a real shelter performance figure**.
- Flare class is not a direct measure of lunar particle exposure.
- Opening a source is not tracked or evidence that a learner understood it.
