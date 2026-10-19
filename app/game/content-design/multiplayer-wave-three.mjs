import { freezeDesign } from './catalogs.mjs';
function row(mode, chapter, name, foundations, walls, keepers, decision, consequence, features) {
  const centre = ([x, y, w, h]) => [x + Math.floor(w / 2) + 0.5, y + Math.floor(h / 2) + 0.5];
  return {
    mode,
    chapter,
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name,
    foundations,
    walls,
    keepers,
    spawns:
      mode === 'team'
        ? [centre(foundations[0]), centre(foundations.at(-1))]
        : [centre(foundations[0])],
    decision,
    consequence,
    moment: consequence,
    mastery:
      mode === 'team'
        ? 'Both pilots bank a useful return and complete every required target without a knockdown.'
        : 'Finish every required objective without losing a life, preserving a short final return.',
    coverage: 0.66,
    ...features,
  };
}
const t = (...args) => row('team', ...args),
  d = (...args) => row('versus', ...args);
export const MULTIPLAYER_WAVE_THREE_LAYOUTS = freezeDesign([
  t(
    'border',
    'Watchpost Welcome',
    [
      [10, 6, 6, 5],
      [28, 24, 7, 5],
      [57, 14, 7, 5],
    ],
    [[23, 12, 2, 13]],
    [[41.5, 7.5, 1, 1]],
    'Connect the internal watchpost before visiting the perimeter, or return to the outer rail behind its patrol?',
    'An interior return lets the partner avoid a border segment that is temporarily occupied.',
    { patrols: [[80, true]] },
  ),
  t(
    'border',
    'Two Patrol Crossings',
    [
      [8, 24, 6, 5],
      [31, 13, 7, 5],
      [60, 5, 6, 5],
    ],
    [
      [20, 5, 2, 16],
      [48, 21, 2, 11],
    ],
    [[36.5, 6.5, -1, 1]],
    'Establish the middle crossing, or use opposite shores while the two patrols are far apart?',
    'The middle connection gives both pilots somewhere to return without sharing a crowded shore.',
    {
      patrols: [
        [20, true],
        [135, false],
      ],
    },
  ),
  t(
    'border',
    'Inside the Watch',
    [
      [7, 15, 6, 5],
      [26, 5, 7, 5],
      [46, 25, 7, 5],
      [61, 14, 5, 5],
    ],
    [[36, 10, 2, 13]],
    [[20.5, 28.5, 1, -1]],
    'Bank an interior loop first, or time an outside crossing to bring the partner a larger safe region?',
    'The interior loop creates a landing unaffected by the perimeter patrol’s route.',
    { patrols: [[55, true]] },
  ),
  t(
    'border',
    'Beacon Stair',
    [
      [8, 6, 7, 5],
      [24, 19, 6, 5],
      [43, 8, 6, 5],
      [58, 25, 7, 5],
    ],
    [
      [32, 25, 10, 2],
      [51, 12, 2, 11],
    ],
    [[35.5, 13.5, 1, 1]],
    'Join the beacon stairs to stay inland, or create a short shore return before the patrol rounds its corner?',
    'Each stair reduces dependence on the perimeter for the partner’s next closure.',
    {
      patrols: [
        [105, true],
        [180, false],
      ],
    },
  ),
  t(
    'border',
    'Patrol Between Piers',
    [
      [7, 25, 7, 5],
      [32, 6, 7, 5],
      [59, 24, 6, 5],
    ],
    [
      [23, 13, 13, 2],
      [44, 18, 2, 12],
    ],
    [
      [16.5, 7.5, 1, 1],
      [56.5, 8.5, -1, 1],
    ],
    'Meet between the piers, or take turns using the outer shore while the other pilot secures a fallback?',
    'A fallback pier makes the return choice flexible when a patrol approaches the preferred landing.',
    {
      patrols: [
        [2, true],
        [156, true],
      ],
    },
  ),
  t(
    'border',
    'Unwatched Passage',
    [
      [9, 16, 6, 5],
      [29, 5, 7, 5],
      [42, 25, 7, 5],
      [60, 14, 6, 5],
    ],
    [
      [24, 23, 2, 9],
      [48, 6, 2, 14],
    ],
    [[35.5, 16.5, 1, 1]],
    'Create an unwatched inner passage, or neutralize the slow corner while the outside patrol is distant?',
    'The inner passage offers a safe partner transfer after the slow corner has been reclaimed.',
    { patrols: [[72, false]], terrain: [['slow', 9, 25, 10, 5]] },
  ),
  t(
    'border',
    'Return Behind Me',
    [
      [6, 6, 7, 5],
      [28, 14, 7, 6],
      [45, 26, 7, 4],
      [60, 7, 6, 5],
    ],
    [
      [20, 15, 2, 17],
      [41, 4, 2, 14],
    ],
    [[33.5, 7.5, 1, 1]],
    'Let one pilot secure the return behind the patrol, or build both internal links before touching the shore?',
    'The partner can land behind the patrol using a connector that did not exist at departure.',
    {
      patrols: [
        [30, true],
        [142, false],
      ],
    },
  ),
  t(
    'border',
    'Watchtower Accord',
    [
      [7, 14, 6, 5],
      [22, 5, 7, 5],
      [31, 25, 7, 5],
      [48, 11, 6, 5],
      [61, 25, 5, 5],
    ],
    [
      [19, 22, 2, 10],
      [40, 7, 2, 13],
    ],
    [
      [35.5, 8.5, 1, 1],
      [52.5, 28.5, -1, -1],
    ],
    'Build an all-interior watchtower circuit, or use two well-timed outer returns to finish sooner?',
    'Both pilots can abandon a threatened shore in favor of a circuit made from shared banks.',
    {
      patrols: [
        [95, true],
        [201, false],
      ],
      coverage: 0.7,
    },
  ),

  d(
    'border',
    'Shore Timing',
    [
      [10, 7, 6, 5],
      [35, 24, 7, 5],
      [59, 13, 5, 5],
    ],
    [[26, 13, 2, 13]],
    [[45.5, 8.5, -1, 1]],
    'Return behind the patrol now, or invest in the inland landing before the next crossing?',
    'The inland landing removes the patrol from the final return decision.',
    { patrols: [[87, true]] },
  ),
  d(
    'border',
    'Inside Track',
    [
      [32, 15, 7, 5],
      [9, 25, 6, 5],
      [60, 5, 5, 5],
    ],
    [
      [22, 6, 2, 14],
      [47, 22, 2, 10],
    ],
    [[36.5, 6.5, 1, 1]],
    'Bank the broad outside corner, or connect the inner track to keep future returns clear?',
    'The smaller inner capture changes where the final large cut can end.',
    {
      patrols: [
        [14, true],
        [141, false],
      ],
    },
  ),
  d(
    'border',
    'Beacon Detour',
    [
      [9, 15, 6, 5],
      [31, 5, 7, 5],
      [55, 25, 7, 5],
    ],
    [
      [24, 22, 2, 10],
      [44, 12, 2, 11],
    ],
    [[56.5, 7.5, -1, 1]],
    'Take the beacon detour around the patrol, or wait one corner turn for a shorter return?',
    'A detour can be faster overall when the direct shore remains occupied.',
    { patrols: [[106, false]] },
  ),
  d(
    'border',
    'Passing Window',
    [
      [8, 25, 7, 5],
      [31, 13, 7, 6],
      [59, 6, 6, 5],
    ],
    [
      [20, 7, 2, 14],
      [46, 24, 2, 8],
    ],
    [[35.5, 6.5, 1, 1]],
    'Use the passing window for a long enclosure, or secure a second refuge before the patrol returns?',
    'The second refuge preserves a legal finish when a faster opening leaves the shore exposed.',
    {
      patrols: [
        [64, true],
        [167, true],
      ],
    },
  ),
  d(
    'border',
    'Rail Reservation',
    [
      [7, 6, 6, 5],
      [26, 25, 7, 5],
      [46, 14, 6, 5],
    ],
    [
      [20, 13, 2, 13],
      [54, 5, 2, 17],
    ],
    [[34.5, 7.5, 1, 1]],
    'Reserve an inland rail for the finale, or claim the upper shore before the patrol reaches it?',
    'The reserved rail provides a final landing independent of the outside patrol’s phase.',
    { patrols: [[38, false]] },
  ),
  d(
    'border',
    'Watch Line Finish',
    [
      [8, 14, 6, 5],
      [25, 5, 7, 5],
      [42, 25, 7, 5],
      [60, 13, 6, 5],
    ],
    [
      [21, 22, 2, 10],
      [37, 10, 2, 13],
    ],
    [[53.5, 7.5, -1, 1]],
    'Finish through the interior watch line, or exploit the patrol gap for one larger perimeter bank?',
    'The finishing choice depends on both the remaining field and the next safe landing.',
    {
      patrols: [
        [90, true],
        [195, false],
      ],
      coverage: 0.7,
    },
  ),

  t(
    'fracture',
    'Permanent Promise',
    [
      [9, 5, 7, 5],
      [29, 16, 7, 5],
      [58, 25, 7, 5],
    ],
    [[23, 23, 2, 9]],
    [[47.5, 8.5, -1, 1]],
    'Capture the erosion source early, or build a chain of permanent foundations beyond its local reach?',
    'Permanent landings stay intact while a clearly marked reclaimed edge may reopen.',
    { erosion: [[18.5, 23.5]] },
  ),
  t(
    'fracture',
    'Two Stable Shores',
    [
      [8, 24, 7, 5],
      [32, 5, 7, 5],
      [59, 16, 6, 5],
    ],
    [
      [22, 6, 2, 15],
      [46, 23, 2, 9],
    ],
    [[37.5, 14.5, 1, 1]],
    'Connect the stable shores first, or let one pilot suppress the source while the other expands?',
    'Capturing the source stops future erosion and preserves the partner’s newly built return.',
    { erosion: [[52.5, 9.5]] },
  ),
  t(
    'fracture',
    'Faultline Detour',
    [
      [6, 15, 7, 5],
      [27, 6, 7, 5],
      [44, 25, 7, 5],
      [61, 13, 5, 5],
    ],
    [[36, 11, 2, 14]],
    [[18.5, 28.5, 1, -1]],
    'Build an outer detour around the faultline, or enclose its source from the central landing?',
    'The detour stays useful while the marked fault edge reopens one exposed tile at a time.',
    {
      erosion: [
        [27.5, 21.5],
        [53.5, 7.5],
      ],
    },
  ),
  t(
    'fracture',
    'Repair Landing',
    [
      [7, 6, 7, 5],
      [25, 20, 7, 5],
      [44, 9, 6, 5],
      [59, 25, 6, 5],
    ],
    [
      [33, 26, 9, 2],
      [51, 15, 2, 10],
    ],
    [[36.5, 7.5, 1, 1]],
    'Repair the short connection after its warning, or capture a larger permanent route around the source?',
    'A partner can replace a damaged route while the other closes a new safe return.',
    { erosion: [[19.5, 14.5]] },
  ),
  t(
    'fracture',
    'Stone Before Silk',
    [
      [9, 25, 7, 5],
      [33, 6, 7, 5],
      [58, 24, 7, 5],
    ],
    [
      [24, 14, 12, 2],
      [45, 18, 2, 13],
    ],
    [
      [14.5, 8.5, 1, 1],
      [54.5, 7.5, -1, 1],
    ],
    'Connect stone foundations before taking fragile central ground, or silence the source with a direct enclosure?',
    'A foundation-based approach keeps rescue and return routes available during erosion warnings.',
    {
      erosion: [
        [36.5, 22.5],
        [22.5, 7.5],
      ],
    },
  ),
  t(
    'fracture',
    'Protected Anchorage',
    [
      [7, 15, 7, 5],
      [28, 5, 7, 5],
      [43, 25, 7, 5],
      [60, 15, 6, 5],
    ],
    [
      [24, 24, 2, 8],
      [49, 6, 2, 13],
    ],
    [[35.5, 17.5, 1, 1]],
    'Secure the upper anchorage, or capture the source from the partner’s lower approach?',
    'The two approaches let the active pilot continue building while a partner has a safe recovery position.',
    { erosion: [[17.5, 27.5]], terrain: [['slow', 53, 23, 10, 5]] },
  ),
  t(
    'fracture',
    'Fault Relay Service',
    [
      [7, 5, 7, 5],
      [28, 14, 8, 6],
      [45, 26, 7, 4],
      [60, 7, 6, 5],
    ],
    [
      [20, 16, 2, 16],
      [41, 5, 2, 13],
    ],
    [[35.5, 7.5, 1, 1]],
    'Open the permanent relay before expanding near the source, or stop erosion first and approach the relay from outside?',
    'The opened bridge stays permanent even while nearby captured field fractures.',
    { erosion: [[14.5, 26.5]], relays: [[46, 15, 10, 3, 53.5, 28.5]] },
  ),
  t(
    'fracture',
    'Coastal Repair Pact',
    [
      [8, 15, 6, 5],
      [23, 5, 7, 5],
      [32, 25, 7, 5],
      [48, 11, 6, 5],
      [61, 24, 5, 5],
    ],
    [
      [20, 22, 2, 10],
      [41, 7, 2, 13],
    ],
    [[36.5, 8.5, 1, 1]],
    'Silence both coastal sources before the finale, or connect permanent refuges and repair only the threatened return?',
    'The final route combines two partners’ permanent links and a reclaimed bridge they kept available.',
    {
      erosion: [
        [14.5, 7.5],
        [53.5, 27.5],
      ],
      coverage: 0.7,
    },
  ),

  d(
    'fracture',
    'Stone Margin',
    [
      [11, 6, 6, 5],
      [35, 25, 7, 5],
      [59, 12, 6, 5],
    ],
    [[27, 12, 2, 14]],
    [[45.5, 7.5, -1, 1]],
    'Capture the eroder first, or race through permanent landings outside its immediate pressure?',
    'Permanent foundations preserve a final return after fragile gains reopen.',
    { erosion: [[19.5, 25.5]] },
  ),
  d(
    'fracture',
    'Faultline Bid',
    [
      [32, 14, 7, 6],
      [9, 25, 7, 5],
      [60, 6, 5, 5],
    ],
    [
      [22, 7, 2, 14],
      [48, 22, 2, 10],
    ],
    [[36.5, 6.5, 1, 1]],
    'Claim the large fragile pocket, or establish an inland return before extending the frontier?',
    'An inland return makes a slightly slower opening resilient to territory loss.',
    { erosion: [[54.5, 28.5]] },
  ),
  d(
    'fracture',
    'Lasting Shortcut',
    [
      [8, 16, 7, 5],
      [31, 5, 7, 5],
      [55, 25, 7, 5],
    ],
    [
      [24, 23, 2, 9],
      [44, 12, 2, 11],
    ],
    [[57.5, 7.5, -1, 1]],
    'Open the permanent shortcut, or enclose the eroder before seeking the relay?',
    'The opened bridge protects a useful finish even while neighboring reclaimed field erodes.',
    { erosion: [[18.5, 27.5]], relays: [[32, 23, 10, 2, 20.5, 7.5]] },
  ),
  d(
    'fracture',
    'Coastal Hedge',
    [
      [9, 24, 7, 5],
      [32, 13, 7, 6],
      [59, 6, 6, 5],
    ],
    [
      [21, 6, 2, 14],
      [47, 25, 2, 7],
    ],
    [[36.5, 6.5, -1, 1]],
    'Hedge the coast with two safe landings, or pursue a fast broad capture near the eroder?',
    'Two landings make the final approach independent of any single fragile connector.',
    {
      erosion: [
        [53.5, 26.5],
        [14.5, 8.5],
      ],
    },
  ),
  d(
    'fracture',
    'Repair Dividend',
    [
      [7, 7, 7, 5],
      [27, 25, 7, 5],
      [47, 14, 6, 5],
    ],
    [
      [20, 14, 2, 14],
      [55, 5, 2, 16],
    ],
    [[35.5, 7.5, 1, 1]],
    'Repair a reopened shortcut, or draw a new outer contour that traps the eroder away from the finish?',
    'The repair and enclosure routes trade a small immediate gain for a different final threat.',
    { erosion: [[38.5, 22.5]] },
  ),
  d(
    'fracture',
    'Unbroken Finish',
    [
      [9, 14, 6, 6],
      [26, 5, 7, 5],
      [43, 25, 7, 5],
      [60, 14, 6, 5],
    ],
    [
      [21, 23, 2, 9],
      [38, 11, 2, 12],
    ],
    [[54.5, 7.5, -1, 1]],
    'Secure the permanent circuit before racing for coverage, or silence both eroders and finish across reclaimed ground?',
    'The final cut uses a return chosen to survive the territory pressure.',
    {
      erosion: [
        [17.5, 27.5],
        [46.5, 8.5],
      ],
      coverage: 0.7,
    },
  ),

  t(
    'sentinel',
    'First Numbered Watch',
    [
      [8, 6, 7, 5],
      [30, 15, 7, 5],
      [59, 24, 6, 5],
    ],
    [[23, 22, 2, 10]],
    [[46.5, 8.5, -1, 1]],
    'Prepare a return near target two while the partner captures target one, or work together on the safer first enclosure?',
    'Only the active numbered target can advance the encounter; preparing the next approach gives the partner useful work.',
    {
      stages: [
        [19.5, 7.5],
        [43.5, 26.5],
        [55.5, 14.5],
      ],
      emitters: [[56.5, 7.5, 'horizontal']],
    },
  ),
  t(
    'sentinel',
    'Citadel Handoff',
    [
      [9, 24, 7, 5],
      [33, 5, 7, 5],
      [59, 15, 6, 5],
    ],
    [
      [22, 6, 2, 14],
      [47, 24, 2, 8],
    ],
    [[37.5, 16.5, 1, 1]],
    'Build the citadel’s lower approach before the first target opens, or let the nearer pilot take both early enclosures?',
    'A prepared lower landing lets the second pilot take over after the numbered stage changes.',
    {
      stages: [
        [16.5, 8.5],
        [47.5, 10.5],
        [34.5, 24.5],
      ],
      emitters: [[54.5, 28.5, 'vertical']],
    },
  ),
  t(
    'sentinel',
    'Three Watch Stations',
    [
      [7, 15, 7, 5],
      [28, 6, 7, 5],
      [45, 25, 7, 5],
      [61, 14, 5, 5],
    ],
    [[37, 11, 2, 13]],
    [[18.5, 28.5, 1, -1]],
    'Create a route past all three stations, or concentrate each enclosure around the currently active target?',
    'A shared route turns the final station into a short capture after the earlier targets unlock it.',
    {
      stages: [
        [22.5, 7.5],
        [54.5, 26.5],
        [43.5, 13.5],
      ],
      emitters: [[17.5, 23.5, 'horizontal']],
    },
  ),
  t(
    'sentinel',
    'Quiet Court Signal',
    [
      [8, 5, 7, 5],
      [26, 20, 7, 5],
      [45, 8, 6, 5],
      [59, 25, 6, 5],
    ],
    [
      [34, 26, 8, 2],
      [52, 15, 2, 10],
    ],
    [[36.5, 7.5, 1, 1]],
    'Capture the warning source before moving into the court, or complete the first station while keeping a short return?',
    'Silencing the source simplifies the court without completing any numbered target automatically.',
    {
      stages: [
        [18.5, 15.5],
        [39.5, 22.5],
        [56.5, 9.5],
      ],
      emitters: [[17.5, 27.5, 'vertical']],
    },
  ),
  t(
    'sentinel',
    'Vault Relay Watch',
    [
      [10, 25, 7, 5],
      [34, 6, 7, 5],
      [58, 24, 7, 5],
    ],
    [
      [25, 14, 11, 2],
      [46, 18, 2, 13],
    ],
    [
      [15.5, 8.5, 1, 1],
      [55.5, 7.5, -1, 1],
    ],
    'Open the permanent vault bridge before advancing the stations, or take the first target from the lower shore?',
    'The bridge gives the partner a useful return while the next numbered target is still protected.',
    {
      stages: [
        [22.5, 7.5],
        [37.5, 24.5],
        [53.5, 16.5],
      ],
      relays: [[17, 22, 10, 2, 43.5, 10.5]],
      emitters: [[57.5, 30.5, 'horizontal']],
    },
  ),
  t(
    'sentinel',
    'Cross Court Cover',
    [
      [8, 15, 7, 5],
      [29, 5, 7, 5],
      [44, 25, 7, 5],
      [60, 15, 6, 5],
    ],
    [
      [25, 24, 2, 8],
      [50, 6, 2, 13],
    ],
    [[36.5, 17.5, 1, 1]],
    'Let the Interceptor cover the active target, or use separate short cuts to create a safe approach before each stage?',
    'A completed approach allows the next pilot to attack the new target with less trail exposed.',
    {
      stages: [
        [18.5, 27.5],
        [42.5, 7.5],
        [54.5, 24.5],
      ],
      emitters: [
        [17.5, 8.5, 'horizontal'],
        [57.5, 7.5, 'vertical'],
      ],
    },
  ),
  t(
    'sentinel',
    'Numbered Return',
    [
      [8, 7, 7, 5],
      [29, 14, 8, 6],
      [46, 26, 7, 4],
      [61, 6, 5, 5],
    ],
    [
      [21, 16, 2, 16],
      [42, 5, 2, 13],
    ],
    [[36.5, 6.5, 1, 1]],
    'Reserve the centre for the final station, or connect it first so either pilot can take over later?',
    'The central return remains useful across every warning and numbered stage change.',
    {
      stages: [
        [15.5, 26.5],
        [54.5, 26.5],
        [38.5, 9.5],
      ],
      emitters: [[56.5, 14.5, 'vertical']],
    },
  ),
  t(
    'sentinel',
    'Citadel Shared Crown',
    [
      [9, 15, 6, 5],
      [24, 5, 7, 5],
      [33, 25, 7, 5],
      [49, 11, 6, 5],
      [62, 24, 4, 5],
    ],
    [
      [21, 22, 2, 10],
      [42, 7, 2, 13],
    ],
    [[37.5, 8.5, 1, 1]],
    'Prepare both final approaches while clearing the outer watch stations, or silence a source before committing to the centre?',
    'The final active target can be taken from either partner’s prepared approach.',
    {
      stages: [
        [16.5, 7.5],
        [54.5, 27.5],
        [34.5, 16.5],
      ],
      emitters: [
        [14.5, 28.5, 'horizontal'],
        [58.5, 7.5, 'vertical'],
      ],
      coverage: 0.7,
    },
  ),

  d(
    'sentinel',
    'Shield Choice',
    [
      [12, 6, 6, 5],
      [36, 25, 7, 5],
      [60, 12, 6, 5],
    ],
    [[28, 12, 2, 14]],
    [[46.5, 7.5, -1, 1]],
    'Capture the near shield first, or establish a core approach before opening either shield?',
    'The prepared approach shortens the final fresh cut when the core enters its open phase.',
    {
      stages: [
        [21.5, 26.5],
        [51.5, 8.5],
        [40.5, 15.5],
      ],
    },
  ),
  d(
    'sentinel',
    'Citadel Wager',
    [
      [33, 14, 7, 6],
      [10, 25, 7, 5],
      [61, 6, 5, 5],
    ],
    [
      [23, 7, 2, 14],
      [49, 22, 2, 10],
    ],
    [[37.5, 6.5, 1, 1]],
    'Open the eastern shield during the first warning, or secure the west return before attacking the citadel?',
    'Shield order changes the landings available when the sentinel begins its exposed phase.',
    {
      stages: [
        [16.5, 8.5],
        [55.5, 28.5],
        [45.5, 15.5],
      ],
    },
  ),
  d(
    'sentinel',
    'Core Approach',
    [
      [9, 16, 7, 5],
      [32, 5, 7, 5],
      [56, 25, 7, 5],
    ],
    [
      [25, 23, 2, 9],
      [45, 12, 2, 11],
    ],
    [[58.5, 7.5, -1, 1]],
    'Build the core approach first, or clear both shields with two quick outer banks?',
    'The earlier route investment determines whether the open-core window is reachable.',
    {
      stages: [
        [19.5, 27.5],
        [43.5, 7.5],
        [37.5, 19.5],
      ],
    },
  ),
  d(
    'sentinel',
    'Vault Opening',
    [
      [10, 24, 7, 5],
      [33, 13, 7, 6],
      [60, 6, 6, 5],
    ],
    [
      [22, 6, 2, 14],
      [48, 25, 2, 7],
    ],
    [[37.5, 6.5, -1, 1]],
    'Open the vault bridge before the shields, or capture a shield en route to the shortcut?',
    'The bridge offers a permanent alternative when the sentinel’s locked lane crosses the direct approach.',
    {
      stages: [
        [15.5, 8.5],
        [54.5, 26.5],
        [42.5, 21.5],
      ],
      relays: [[26, 25, 12, 3, 29.5, 7.5]],
    },
  ),
  d(
    'sentinel',
    'Last Shield Bet',
    [
      [8, 7, 7, 5],
      [28, 25, 7, 5],
      [48, 14, 6, 5],
    ],
    [
      [21, 14, 2, 14],
      [56, 5, 2, 16],
    ],
    [[36.5, 7.5, 1, 1]],
    'Leave the distant shield for last to approach the core from that side, or open it first and return along the lower landings?',
    'The last shield location decides the first useful exposed-core approach.',
    {
      stages: [
        [17.5, 27.5],
        [51.5, 8.5],
        [39.5, 20.5],
      ],
    },
  ),
  d(
    'sentinel',
    'Crown Photo Finish',
    [
      [10, 14, 6, 6],
      [27, 5, 7, 5],
      [44, 25, 7, 5],
      [61, 14, 5, 5],
    ],
    [
      [22, 23, 2, 9],
      [39, 11, 2, 12],
    ],
    [[55.5, 7.5, -1, 1]],
    'Prepare a conservative core return, or leave room for a larger fresh release cut during the open window?',
    'The race ends when the core and coverage objectives are complete on the same fair board rules.',
    {
      stages: [
        [18.5, 27.5],
        [47.5, 8.5],
        [34.5, 19.5],
      ],
      coverage: 0.7,
    },
  ),

  t(
    'aurora',
    'Polar Link Exchange',
    [
      [10, 5, 7, 5],
      [30, 16, 7, 5],
      [59, 25, 7, 5],
    ],
    [[24, 23, 2, 9]],
    [[48.5, 8.5, -1, 1]],
    'Use the tailwind to reach the relay, or bank an ordinary-speed approach before opening the partner’s bridge?',
    'The bridge remains useful after the captured arrow band loses its acceleration.',
    { currents: [['right', 18, 6, 12, 4]], relays: [[40, 20, 10, 3, 18.5, 25.5]] },
  ),
  t(
    'aurora',
    'Afterglow Watch',
    [
      [10, 24, 7, 5],
      [34, 5, 7, 5],
      [60, 16, 6, 5],
    ],
    [
      [23, 6, 2, 15],
      [47, 24, 2, 8],
    ],
    [[38.5, 14.5, 1, 1]],
    'Create an interior return before the patrol and lane overlap, or exploit the quiet shore while the warning source rests?',
    'An interior return separates the partner’s lane timing from the outside patrol’s position.',
    { emitters: [[54.5, 9.5, 'vertical']], patrols: [[92, true]] },
  ),
  t(
    'aurora',
    'Frozen Relay Promise',
    [
      [8, 15, 7, 5],
      [29, 6, 7, 5],
      [46, 25, 7, 5],
      [62, 13, 4, 5],
    ],
    [[38, 11, 2, 14]],
    [[19.5, 28.5, 1, -1]],
    'Open the permanent relay before confronting erosion, or capture the source and approach the switch from a quiet flank?',
    'The opened bridge remains permanent while nearby reclaimed edges can reopen.',
    { erosion: [[28.5, 21.5]], relays: [[49, 13, 10, 3, 55.5, 7.5]] },
  ),
  t(
    'aurora',
    'Compass Night Shift',
    [
      [9, 6, 7, 5],
      [27, 20, 7, 5],
      [46, 9, 6, 5],
      [60, 25, 6, 5],
    ],
    [
      [35, 26, 8, 2],
      [53, 15, 2, 10],
    ],
    [[37.5, 7.5, 1, 1]],
    'Take the marked fast lane during rest, or neutralize it first so the partner can return against its direction?',
    'A reclaimed band gives the partner a predictable return before the next locked warning.',
    {
      currents: [
        ['right', 17, 7, 13, 4],
        ['up', 38, 18, 4, 7],
      ],
      emitters: [[18.5, 26.5, 'horizontal']],
    },
  ),
  t(
    'aurora',
    'Three Polar Stations',
    [
      [11, 25, 7, 5],
      [35, 6, 7, 5],
      [59, 24, 7, 5],
    ],
    [
      [26, 14, 11, 2],
      [47, 18, 2, 13],
    ],
    [
      [16.5, 8.5, 1, 1],
      [56.5, 7.5, -1, 1],
    ],
    'Use the arrow route to prepare later stations, or have both pilots shorten the currently active station’s exposure?',
    'The partner’s prepared approach becomes useful when the next station loses its protection.',
    {
      stages: [
        [23.5, 7.5],
        [38.5, 24.5],
        [54.5, 16.5],
      ],
      currents: [['right', 17, 20, 14, 4]],
      emitters: [[58.5, 30.5, 'vertical']],
    },
  ),
  t(
    'aurora',
    'Shelter in the Lights',
    [
      [9, 15, 7, 5],
      [30, 5, 7, 5],
      [45, 25, 7, 5],
      [61, 15, 5, 5],
    ],
    [
      [26, 24, 2, 8],
      [51, 6, 2, 13],
    ],
    [[37.5, 17.5, 1, 1]],
    'Open the shelter bridge first, or silence the warning source before reaching the numbered relay?',
    'The shelter bridge gives either pilot a safe rescue approach during later lane warnings.',
    {
      relays: [[17, 23, 8, 3, 19.5, 7.5]],
      emitters: [[56.5, 27.5, 'horizontal']],
      terrain: [['slow', 39, 7, 8, 5]],
    },
  ),
  t(
    'aurora',
    'Aurora Repair Watch',
    [
      [9, 7, 7, 5],
      [30, 14, 8, 6],
      [47, 26, 7, 4],
      [62, 6, 4, 5],
    ],
    [
      [22, 16, 2, 16],
      [43, 5, 2, 13],
    ],
    [[37.5, 6.5, 1, 1]],
    'Build the interior foundations before the patrol arrives, or capture the erosion source to preserve the partner’s outside return?',
    'The final approach has both a permanent refuge and a repaired route into the remaining field.',
    { erosion: [[16.5, 26.5]], patrols: [[112, false]], currents: [['right', 39, 21, 16, 4]] },
  ),
  t(
    'aurora',
    'Expedition Homecoming',
    [
      [10, 15, 6, 5],
      [25, 5, 7, 5],
      [34, 25, 7, 5],
      [50, 11, 6, 5],
      [62, 24, 4, 5],
    ],
    [
      [22, 22, 2, 10],
      [43, 7, 2, 13],
    ],
    [[38.5, 8.5, 1, 1]],
    'Open the shared bridge and prepare the final station together, or alternate source suppression with stage captures?',
    'The homecoming uses a bridge, a quiet source and two prepared returns created by different pilots.',
    {
      relays: [[25, 17, 8, 3, 17.5, 7.5]],
      stages: [
        [16.5, 27.5],
        [55.5, 27.5],
        [35.5, 16.5],
      ],
      emitters: [[59.5, 7.5, 'vertical']],
      coverage: 0.72,
    },
  ),

  d(
    'aurora',
    'Polar Dividend',
    [
      [13, 6, 6, 5],
      [37, 25, 7, 5],
      [61, 12, 5, 5],
    ],
    [[29, 12, 2, 14]],
    [[47.5, 7.5, -1, 1]],
    'Use the tailwind for an early relay, or neutralize the band before committing to the long northern cut?',
    'The relay and captured arrows change the return value of the same crossing.',
    { currents: [['right', 20, 7, 16, 4]], relays: [[43, 21, 12, 3, 22.5, 26.5]] },
  ),
  d(
    'aurora',
    'Warning on the Shore',
    [
      [34, 14, 7, 6],
      [11, 25, 7, 5],
      [61, 5, 5, 5],
    ],
    [
      [24, 7, 2, 14],
      [50, 22, 2, 10],
    ],
    [[38.5, 6.5, 1, 1]],
    'Connect the interior landing to avoid the patrol, or bank the open shore during the emitter’s rest?',
    'A safe interior endpoint decouples the last cut from two different threat clocks.',
    { emitters: [[56.5, 28.5, 'horizontal']], patrols: [[89, true]] },
  ),
  d(
    'aurora',
    'Permanent Aurora',
    [
      [10, 16, 7, 5],
      [33, 5, 7, 5],
      [57, 25, 7, 5],
    ],
    [
      [26, 23, 2, 9],
      [46, 12, 2, 11],
    ],
    [[59.5, 7.5, -1, 1]],
    'Open a permanent bridge before the eroder reaches the new frontier, or capture the source with a wider first bank?',
    'The permanent connector preserves the final approach even when surrounding coverage changes.',
    { erosion: [[20.5, 27.5]], relays: [[34, 21, 10, 3, 44.5, 7.5]] },
  ),
  d(
    'aurora',
    'Highland Lock Race',
    [
      [11, 24, 7, 5],
      [34, 13, 7, 6],
      [61, 6, 5, 5],
    ],
    [
      [23, 6, 2, 14],
      [49, 25, 2, 7],
    ],
    [[38.5, 6.5, -1, 1]],
    'Use the fast band while the lane rests, or capture it first so the final return can run against its arrows?',
    'The first directional capture changes which later warning window is long enough.',
    {
      currents: [
        ['right', 19, 25, 14, 4],
        ['down', 51, 12, 5, 11],
      ],
      emitters: [[15.5, 8.5, 'vertical']],
    },
  ),
  d(
    'aurora',
    'Polar Crown Route',
    [
      [9, 7, 7, 5],
      [29, 25, 7, 5],
      [49, 14, 6, 5],
    ],
    [
      [22, 14, 2, 14],
      [57, 5, 2, 16],
    ],
    [[37.5, 7.5, 1, 1]],
    'Open the bridge before attacking the shield relays, or take a shield on the route to the shortcut?',
    'The bridge leaves a permanent core approach available during the sentinel’s open window.',
    {
      stages: [
        [18.5, 27.5],
        [52.5, 8.5],
        [40.5, 20.5],
      ],
      relays: [[32, 9, 12, 3, 46.5, 27.5]],
    },
  ),
  d(
    'aurora',
    'Expedition Decider',
    [
      [11, 14, 6, 6],
      [28, 5, 7, 5],
      [45, 25, 7, 5],
      [61, 13, 5, 5],
    ],
    [
      [23, 23, 2, 9],
      [40, 11, 2, 12],
    ],
    [[56.5, 7.5, -1, 1]],
    'Reclaim the tailwind before opening the final shield, or leave it active for the decisive core approach?',
    'The final race combines a chosen shield order, a readable attack window and the route built at the start.',
    {
      stages: [
        [19.5, 27.5],
        [48.5, 8.5],
        [35.5, 19.5],
      ],
      currents: [['right', 17, 15, 16, 4]],
      coverage: 0.72,
    },
  ),
]);
