import { freezeDesign } from './catalogs.mjs';

// Coordinates are authored per board. The helpers supply the envelope and
// centre each explicitly selected landing; no previous level is transformed.
function row(
  mode,
  chapter,
  name,
  foundations,
  walls,
  keepers,
  decision,
  consequence,
  features = {},
) {
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
        ? 'Both pilots contribute a capture and use the shared return without a knockdown.'
        : 'Clear without losing a life after using the chapter mechanic to shorten a return.',
    coverage: 0.64,
    ...features,
  };
}
const t = (...args) => row('team', ...args),
  d = (...args) => row('versus', ...args);

export const MULTIPLAYER_WAVE_TWO_LAYOUTS = freezeDesign([
  t(
    'phaseworks',
    'Glass Escort',
    [
      [8, 12, 5, 5],
      [29, 5, 7, 4],
      [45, 25, 7, 4],
      [61, 15, 5, 5],
    ],
    [[25, 15, 2, 12]],
    [
      [42.5, 8.5, 1, 1],
      [16.5, 27.5, 1, -1],
    ],
    'Escort a short central cut with Interceptor Support, or bank the high refuge before the keeper approaches?',
    'The high refuge gives the cutting partner a return that does not depend on Support being ready.',
  ),
  t(
    'phaseworks',
    'Two Return Windows',
    [
      [9, 6, 5, 5],
      [28, 24, 6, 5],
      [40, 10, 6, 5],
      [57, 24, 6, 5],
    ],
    [
      [22, 11, 2, 13],
      [51, 6, 2, 13],
    ],
    [
      [35.5, 5.5, 1, 1],
      [51.5, 29.5, -1, -1],
    ],
    'Connect both windows on the lower rail, or open a diagonal refuge before the two keepers converge?',
    'Separate windows let the exposed pilot close while the partner preserves the next departure.',
  ),
  t(
    'phaseworks',
    'Prism Pocket',
    [
      [7, 25, 6, 5],
      [30, 13, 8, 6],
      [59, 5, 6, 5],
    ],
    [
      [19, 5, 2, 16],
      [42, 23, 16, 2],
    ],
    [
      [29.5, 7.5, 1, 1],
      [54.5, 28.5, -1, -1],
    ],
    'Take the short prism pocket while its keeper is distant, or share the central landing before expanding?',
    'A shared prism landing lets the Disruptor approach a keeper while the Interceptor covers a different exposed trail.',
  ),
  t(
    'phaseworks',
    'Quiet Side Passage',
    [
      [6, 15, 6, 5],
      [26, 6, 6, 5],
      [44, 25, 6, 5],
      [60, 15, 5, 5],
    ],
    [[34, 7, 2, 18]],
    [
      [17.5, 8.5, 1, 1],
      [54.5, 27.5, -1, -1],
    ],
    'Develop the quiet side passage first, or take turns crossing the longer southern opening?',
    'The side passage remains available when a travelling impact makes the middle route too expensive.',
  ),
  t(
    'phaseworks',
    'Refraction Steps',
    [
      [8, 5, 5, 5],
      [22, 19, 5, 5],
      [40, 6, 5, 5],
      [59, 25, 5, 5],
    ],
    [
      [30, 24, 14, 2],
      [51, 12, 2, 13],
    ],
    [
      [33.5, 13.5, 1, -1],
      [17.5, 29.5, 1, -1],
    ],
    'Climb the staggered refraction steps together, or give each pilot a separate outside return?',
    'A completed step shortens the next partner’s trail before another impact can travel along it.',
  ),
  t(
    'phaseworks',
    'Shared Afterimage',
    [
      [8, 24, 7, 5],
      [33, 5, 7, 5],
      [55, 23, 8, 5],
    ],
    [
      [24, 13, 11, 2],
      [40, 18, 12, 2],
    ],
    [
      [18.5, 7.5, 1, 1],
      [52.5, 8.5, -1, 1],
    ],
    'Meet beneath the top refuge, or complete opposite outside cuts before exchanging support positions?',
    'The exchanged positions let each specialist assist a different route without forcing simultaneous inputs.',
  ),
  t(
    'phaseworks',
    'Lens Reserve',
    [
      [6, 6, 7, 5],
      [26, 24, 6, 5],
      [35, 13, 7, 5],
      [60, 7, 5, 5],
    ],
    [
      [18, 14, 2, 17],
      [48, 12, 2, 15],
    ],
    [
      [31.5, 6.5, 1, 1],
      [55.5, 28.5, -1, -1],
    ],
    'Save the centre lens as a late refuge, or connect it immediately and divide the outer bays?',
    'The saved lens gives a threatened partner a new landing after the outer routes have become long.',
  ),
  t(
    'phaseworks',
    'Observatory Accord',
    [
      [7, 14, 5, 6],
      [21, 5, 6, 5],
      [31, 25, 6, 5],
      [46, 13, 5, 5],
      [60, 24, 6, 5],
    ],
    [
      [28, 10, 2, 10],
      [52, 5, 2, 12],
    ],
    [
      [42.5, 5.5, 1, 1],
      [14.5, 28.5, 1, -1],
    ],
    'Build a shared observatory circuit in stages, or alternate short safe banks with one long protected cut?',
    'Both partners finish with access to a circuit whose individual links they secured for each other.',
    { coverage: 0.68 },
  ),

  d(
    'phaseworks',
    'Glass Margin',
    [
      [11, 6, 7, 5],
      [37, 23, 6, 5],
      [58, 9, 5, 5],
    ],
    [[27, 10, 2, 15]],
    [[48.5, 17.5, -1, 1]],
    'Connect the low margin first, or risk the long eastern return for an early lead?',
    'A low connector allows the second crossing to finish before a travelling impact reaches its owner.',
  ),
  d(
    'phaseworks',
    'Prism Bid',
    [
      [31, 14, 7, 6],
      [8, 24, 6, 5],
      [59, 6, 5, 6],
    ],
    [
      [20, 6, 2, 13],
      [47, 20, 2, 11],
    ],
    [
      [12.5, 8.5, 1, 1],
      [57.5, 28.5, -1, -1],
    ],
    'Bank a short western wedge, or approach the larger eastern prism while its keeper is moving away?',
    'A secured wedge creates a second attempt route if the large cut has to be abandoned.',
  ),
  d(
    'phaseworks',
    'Thin Refraction',
    [
      [9, 15, 6, 5],
      [34, 5, 6, 5],
      [54, 25, 7, 4],
    ],
    [[24, 22, 14, 2]],
    [[45.5, 11.5, -1, 1]],
    'Link the upper lens, or enclose the thin southern strip before crossing the centre?',
    'The upper lens exchanges immediate coverage for a much shorter final exposure.',
  ),
  d(
    'phaseworks',
    'Afterimage Chase',
    [
      [32, 25, 7, 5],
      [8, 7, 6, 5],
      [59, 12, 6, 5],
    ],
    [
      [22, 14, 2, 12],
      [46, 4, 2, 14],
    ],
    [[35.5, 8.5, 1, 1]],
    'Race through the central opening, or wait for the keeper to leave the shorter western line?',
    'Reading the keeper rather than the rival decides which return can close before impact.',
  ),
  d(
    'phaseworks',
    'Borrowed Seconds',
    [
      [9, 25, 6, 5],
      [27, 11, 7, 5],
      [54, 6, 8, 4],
    ],
    [[43, 17, 2, 15]],
    [
      [15.5, 8.5, 1, 1],
      [57.5, 28.5, -1, -1],
    ],
    'Take two short banks, or invest in the diagonal link that removes a later crossing?',
    'The diagonal link pays back its longer first cut on the last approach.',
  ),
  d(
    'phaseworks',
    'Prism Photo Finish',
    [
      [7, 6, 6, 5],
      [25, 25, 6, 5],
      [44, 11, 6, 5],
      [61, 23, 5, 5],
    ],
    [
      [20, 12, 2, 15],
      [52, 5, 2, 14],
    ],
    [
      [35.5, 6.5, 1, 1],
      [48.5, 29.5, -1, -1],
    ],
    'Clear the outer pockets in sequence, or use the centre prism for one decisive enclosure?',
    'The final choice depends on the keeper’s current region and the returns built earlier.',
    { coverage: 0.68 },
  ),

  t(
    'livewire',
    'First Warning Shift',
    [
      [8, 15, 7, 5],
      [32, 5, 7, 5],
      [59, 24, 6, 5],
    ],
    [[27, 20, 2, 11]],
    [[45.5, 14.5, -1, 1]],
    'Close a short connector during the first marked lane, or wait on a landing for the rest window?',
    'A warning is tied to one pilot’s original cut; closing that cut gives the partner a clear launch.',
    { emitters: [[55.5, 8.5, 'horizontal']] },
  ),
  t(
    'livewire',
    'Column Partners',
    [
      [9, 24, 6, 5],
      [34, 13, 6, 6],
      [58, 5, 6, 5],
    ],
    [
      [21, 5, 2, 15],
      [47, 22, 2, 10],
    ],
    [[34.5, 5.5, 1, 1]],
    'Join the central station before a column locks, or work the two outer bays independently?',
    'The central station provides a short return on either side of a locked column.',
    { emitters: [[13.5, 9.5, 'vertical']] },
  ),
  t(
    'livewire',
    'Kiln Crossing',
    [
      [6, 6, 7, 5],
      [25, 24, 7, 5],
      [45, 6, 6, 5],
      [59, 23, 6, 5],
    ],
    [[33, 12, 3, 14]],
    [[48.5, 29.5, -1, -1]],
    'Cross above the kiln first, or establish the southern return before the next horizontal warning?',
    'The southern return lets a partner stop exposing a long line without abandoning their chosen side.',
    { emitters: [[56.5, 13.5, 'horizontal']], terrain: [['slow', 14, 16, 10, 5]] },
  ),
  t(
    'livewire',
    'Staggered Furnaces',
    [
      [8, 16, 5, 5],
      [30, 6, 6, 5],
      [41, 25, 6, 5],
      [60, 13, 5, 5],
    ],
    [
      [24, 19, 2, 13],
      [48, 4, 2, 13],
    ],
    [[36.5, 17.5, 1, 1]],
    'Complete one outside refuge before both furnaces wake, or connect through the middle while only one cut is exposed?',
    'Shared refuges reduce the length of two separately owned warnings.',
    {
      emitters: [
        [17.5, 6.5, 'horizontal'],
        [56.5, 28.5, 'vertical'],
      ],
    },
  ),
  t(
    'livewire',
    'Cooling Apron',
    [
      [7, 25, 6, 5],
      [32, 14, 7, 5],
      [60, 6, 5, 5],
    ],
    [
      [21, 8, 13, 2],
      [42, 26, 13, 2],
    ],
    [[37.5, 6.5, -1, 1]],
    'Enclose the slow cooling apron to improve both returns, or connect the centre without crossing it?',
    'A neutralized apron stops consuming the partner’s warning window.',
    { emitters: [[14.5, 14.5, 'vertical']], terrain: [['slow', 43, 13, 11, 7]] },
  ),
  t(
    'livewire',
    'Rail Before Fire',
    [
      [7, 6, 6, 6],
      [27, 25, 7, 5],
      [45, 11, 7, 5],
      [61, 24, 5, 5],
    ],
    [
      [19, 16, 2, 15],
      [54, 4, 2, 15],
    ],
    [[33.5, 7.5, 1, 1]],
    'Secure the long lower rail first, or use the short upper return while the lane is marked?',
    'The rail becomes permanent shelter for a later crossing during an active warning.',
    {
      emitters: [
        [13.5, 25.5, 'horizontal'],
        [60.5, 10.5, 'vertical'],
      ],
    },
  ),
  t(
    'livewire',
    'Offshift Rescue',
    [
      [9, 7, 6, 5],
      [26, 15, 6, 5],
      [43, 25, 6, 5],
      [59, 7, 6, 5],
    ],
    [
      [35, 3, 2, 10],
      [49, 14, 2, 9],
    ],
    [[33.5, 27.5, 1, -1]],
    'Open the middle rescue approach, or capture the first furnace from the outer bay?',
    'Disabling one source makes the partner’s support and recovery approach less pressured.',
    {
      emitters: [
        [17.5, 27.5, 'vertical'],
        [56.5, 18.5, 'horizontal'],
      ],
    },
  ),
  t(
    'livewire',
    'Foundry Handshake',
    [
      [6, 16, 6, 5],
      [22, 5, 6, 5],
      [31, 26, 6, 4],
      [48, 12, 6, 5],
      [61, 25, 5, 5],
    ],
    [
      [19, 19, 2, 11],
      [41, 5, 2, 15],
    ],
    [[35.5, 18.5, 1, 1]],
    'Capture the western furnace to simplify the centre, or connect every refuge before attacking either source?',
    'The last crossing uses a calm route that both pilots built across the active foundry.',
    {
      coverage: 0.68,
      emitters: [
        [12.5, 6.5, 'horizontal'],
        [57.5, 8.5, 'vertical'],
      ],
    },
  ),

  d(
    'livewire',
    'Warning Bid',
    [
      [8, 7, 7, 5],
      [33, 24, 7, 5],
      [59, 11, 5, 5],
    ],
    [[23, 14, 2, 13]],
    [[41.5, 7.5, 1, 1]],
    'Close before the first warning fires, or wait for recovery to make the larger bank?',
    'Both rivals receive the same warning rules and choose their own exposed distance.',
    { emitters: [[54.5, 26.5, 'horizontal']] },
  ),
  d(
    'livewire',
    'Column Gambit',
    [
      [31, 15, 7, 5],
      [8, 25, 6, 5],
      [60, 5, 5, 5],
    ],
    [
      [19, 7, 2, 15],
      [49, 18, 2, 13],
    ],
    [[35.5, 5.5, -1, 1]],
    'Take the nearby southern return, or risk the northern link before a column locks?',
    'The northern link shortens every later crossing of the foundry.',
    { emitters: [[55.5, 27.5, 'vertical']] },
  ),
  d(
    'livewire',
    'Cooling Dividend',
    [
      [11, 24, 6, 5],
      [34, 6, 7, 5],
      [58, 20, 6, 5],
    ],
    [[26, 12, 2, 13]],
    [[45.5, 9.5, 1, 1]],
    'Neutralize the slow apron first, or use the unmarked top edge for immediate coverage?',
    'The apron costs time once and provides an ordinary-speed return after capture.',
    { emitters: [[53.5, 29.5, 'horizontal']], terrain: [['slow', 33, 17, 13, 6]] },
  ),
  d(
    'livewire',
    'Locked Turn',
    [
      [8, 15, 6, 5],
      [28, 5, 6, 5],
      [46, 25, 6, 5],
    ],
    [
      [38, 10, 2, 15],
      [55, 6, 2, 15],
    ],
    [[21.5, 26.5, 1, -1]],
    'Turn around the western wall before exposure, or commit to the long lower bank during rest?',
    'A completed upper link gives a safe turning point when the next lane locks.',
    { emitters: [[60.5, 27.5, 'vertical']] },
  ),
  d(
    'livewire',
    'Twin Furnace Sprint',
    [
      [31, 13, 8, 7],
      [7, 7, 7, 5],
      [58, 25, 7, 5],
    ],
    [
      [20, 22, 13, 2],
      [44, 7, 13, 2],
    ],
    [[34.5, 29.5, 1, -1]],
    'Capture a furnace to simplify the race, or bank two clear corners before changing the threat pattern?',
    'Removing a source changes which long connector is worth attempting.',
    {
      emitters: [
        [14.5, 26.5, 'horizontal'],
        [59.5, 8.5, 'vertical'],
      ],
    },
  ),
  d(
    'livewire',
    'Afterglow Finish',
    [
      [9, 5, 6, 5],
      [26, 25, 6, 5],
      [43, 14, 6, 5],
      [60, 6, 5, 5],
    ],
    [
      [20, 12, 2, 15],
      [52, 20, 2, 12],
    ],
    [[34.5, 7.5, 1, 1]],
    'Build the safe centre in two banks, or race the far perimeter during the longest rest window?',
    'The final winning bank rewards the route chosen before the first warning.',
    {
      emitters: [
        [13.5, 28.5, 'vertical'],
        [58.5, 27.5, 'horizontal'],
      ],
      coverage: 0.68,
    },
  ),

  t(
    'relay',
    'Partner First Link',
    [
      [8, 6, 6, 5],
      [30, 15, 7, 5],
      [59, 24, 6, 5],
    ],
    [[22, 14, 2, 13]],
    [
      [45.5, 7.5, 1, 1],
      [16.5, 27.5, 1, -1],
    ],
    'Capture the near relay to build the partner’s bridge, or create an outside return before approaching it?',
    'The numbered gate becomes a permanent shared landing when its matching relay is captured.',
    { relays: [[42, 15, 8, 3, 17.5, 7.5]] },
  ),
  t(
    'relay',
    'Archive Exchange',
    [
      [7, 24, 7, 5],
      [32, 5, 7, 5],
      [59, 15, 6, 5],
    ],
    [
      [22, 4, 2, 15],
      [47, 24, 2, 8],
    ],
    [[36.5, 24.5, -1, -1]],
    'Open the upper archive bridge for the far pilot, or clear the lower route to reach the second relay?',
    'Each relay grants the other pilot a useful new departure rather than asking them to wait.',
    {
      relays: [
        [24, 10, 8, 3, 13.5, 16.5],
        [47, 13, 9, 3, 43.5, 26.5],
      ],
    },
  ),
  t(
    'relay',
    'Two Keys Two Shores',
    [
      [6, 15, 6, 5],
      [30, 25, 7, 5],
      [60, 6, 6, 5],
    ],
    [
      [25, 7, 2, 12],
      [44, 18, 2, 14],
    ],
    [[36.5, 8.5, 1, 1]],
    'Split the two shore relays, or open one bridge together before taking separate bays?',
    'A first bridge makes the second relay reachable from a shorter and safer direction.',
    {
      relays: [
        [14, 23, 11, 3, 19.5, 7.5],
        [49, 13, 10, 3, 56.5, 27.5],
      ],
    },
  ),
  t(
    'relay',
    'Vault Bypass',
    [
      [8, 5, 6, 5],
      [29, 14, 8, 6],
      [58, 25, 7, 5],
    ],
    [
      [20, 13, 2, 15],
      [44, 6, 2, 13],
    ],
    [[52.5, 8.5, -1, 1]],
    'Take the vault’s side entrance, or open its numbered bridge before a keeper blocks the central approach?',
    'The bridge provides a return across the vault that remains usable after both pilots exchange sides.',
    { relays: [[37, 16, 7, 3, 13.5, 27.5]] },
  ),
  t(
    'relay',
    'Lower Shelf Pact',
    [
      [9, 24, 6, 5],
      [32, 6, 7, 5],
      [59, 23, 6, 5],
    ],
    [
      [23, 14, 13, 2],
      [43, 17, 2, 14],
    ],
    [
      [15.5, 8.5, 1, 1],
      [54.5, 7.5, -1, 1],
    ],
    'Open the lower shelf to connect both starts, or bank the top relay first and let the partner approach from above?',
    'The selected first relay decides which pilot gets the next short crossing.',
    {
      relays: [
        [16, 26, 14, 2, 41.5, 8.5],
        [47, 12, 10, 3, 35.5, 23.5],
      ],
    },
  ),
  t(
    'relay',
    'Hidden Court Delivery',
    [
      [6, 6, 6, 5],
      [31, 24, 7, 5],
      [59, 6, 6, 5],
    ],
    [
      [21, 11, 2, 15],
      [46, 11, 2, 15],
    ],
    [
      [35.5, 6.5, 1, 1],
      [54.5, 29.5, -1, -1],
    ],
    'Open a side bridge into the court, or secure the broad bottom approach before activating the second link?',
    'The two numbered links turn an exposed court into several independent returns.',
    {
      relays: [
        [24, 16, 7, 3, 15.5, 19.5],
        [38, 20, 7, 3, 55.5, 17.5],
      ],
    },
  ),
  t(
    'relay',
    'Dispatch Priority',
    [
      [7, 16, 6, 5],
      [26, 5, 7, 5],
      [45, 24, 7, 5],
      [61, 13, 5, 5],
    ],
    [
      [20, 23, 2, 9],
      [39, 8, 2, 13],
    ],
    [[33.5, 29.5, 1, -1]],
    'Dispatch the western relay first for a quick bridge, or open the long eastern connector that benefits the partner’s next two cuts?',
    'Opening order changes total exposure even though both relays remain mandatory.',
    {
      relays: [
        [14, 11, 10, 3, 35.5, 5.5],
        [51, 16, 8, 3, 27.5, 27.5],
      ],
    },
  ),
  t(
    'relay',
    'Archive Home Route',
    [
      [8, 25, 6, 5],
      [23, 6, 6, 5],
      [35, 16, 6, 5],
      [59, 7, 6, 5],
    ],
    [
      [19, 14, 2, 13],
      [47, 20, 2, 12],
    ],
    [[38.5, 7.5, 1, 1]],
    'Build the archive route clockwise, or split relay duties and join the centre last?',
    'Both pilots can traverse the completed archive route using the links each one opened.',
    {
      relays: [
        [23, 18, 10, 3, 13.5, 9.5],
        [44, 11, 12, 3, 56.5, 28.5],
      ],
      coverage: 0.68,
    },
  ),

  d(
    'relay',
    'First Key Advantage',
    [
      [9, 16, 6, 5],
      [33, 5, 6, 5],
      [58, 25, 6, 5],
    ],
    [[26, 19, 2, 13]],
    [[43.5, 14.5, 1, 1]],
    'Open the near bridge before banking coverage, or reach the relay from the longer outer loop?',
    'An early bridge exchanges a smaller first bank for a faster next departure.',
    { relays: [[42, 22, 12, 3, 20.5, 7.5]] },
  ),
  d(
    'relay',
    'Archive Auction',
    [
      [30, 13, 8, 6],
      [8, 24, 6, 5],
      [59, 6, 6, 5],
    ],
    [
      [20, 5, 2, 14],
      [46, 21, 2, 11],
    ],
    [
      [13.5, 8.5, 1, 1],
      [56.5, 28.5, -1, -1],
    ],
    'Buy the upper shortcut with a small relay cut, or claim the western pocket and reach the switch from below?',
    'The shortcut creates a different final route from the same central landing.',
    { relays: [[39, 15, 7, 3, 33.5, 6.5]] },
  ),
  d(
    'relay',
    'Keys Before Corners',
    [
      [8, 6, 6, 5],
      [29, 25, 7, 5],
      [58, 14, 6, 5],
    ],
    [[22, 12, 2, 12]],
    [[41.5, 7.5, 1, 1]],
    'Collect both keys before the corner race, or alternate a key and a large bank?',
    'Opening the farther bridge first removes one long unprotected crossing.',
    {
      relays: [
        [29, 12, 9, 3, 14.5, 26.5],
        [46, 23, 10, 3, 52.5, 8.5],
      ],
    },
  ),
  d(
    'relay',
    'Shelf Shortcut',
    [
      [9, 24, 6, 5],
      [34, 13, 7, 6],
      [59, 5, 6, 5],
    ],
    [
      [21, 6, 2, 14],
      [48, 20, 2, 12],
    ],
    [[36.5, 6.5, -1, 1]],
    'Approach the shelf relay directly, or surround the lower bay before turning toward it?',
    'A direct relay cut changes the shelf from an obstacle into the safest final landing.',
    { relays: [[25, 23, 12, 3, 55.5, 27.5]] },
  ),
  d(
    'relay',
    'Priority Dispatch',
    [
      [7, 15, 6, 5],
      [29, 5, 6, 5],
      [47, 25, 7, 5],
    ],
    [
      [21, 22, 2, 10],
      [39, 12, 2, 13],
    ],
    [[56.5, 8.5, -1, 1]],
    'Dispatch the western link first, or take the eastern relay that shortens two future crossings?',
    'Relay order produces different exposure budgets without changing either rival’s board.',
    {
      relays: [
        [14, 9, 12, 3, 33.5, 28.5],
        [47, 14, 12, 3, 18.5, 27.5],
      ],
    },
  ),
  d(
    'relay',
    'Archive Decider',
    [
      [8, 5, 7, 5],
      [28, 24, 6, 5],
      [44, 13, 6, 5],
      [60, 25, 6, 5],
    ],
    [
      [21, 11, 2, 13],
      [53, 5, 2, 15],
    ],
    [[34.5, 7.5, 1, 1]],
    'Open the central links for a quick final cut, or keep the outer return and claim the broad southern pocket?',
    'The last bank uses the bridge selected at the beginning of the race.',
    {
      relays: [
        [26, 14, 10, 3, 16.5, 26.5],
        [43, 23, 10, 3, 57.5, 7.5],
      ],
      coverage: 0.68,
    },
  ),

  t(
    'crosswind',
    'Tailwind Delivery',
    [
      [8, 14, 6, 6],
      [32, 5, 7, 5],
      [59, 24, 6, 5],
    ],
    [[26, 23, 2, 9]],
    [[47.5, 7.5, -1, 1]],
    'Follow the arrows to connect the upper landing, or clear the lower approach first for a normal-speed return?',
    'Capturing the arrow band removes its speed effect and changes the partner’s return budget.',
    {
      currents: [
        ['right', 15, 15, 16, 4],
        ['down', 47, 17, 5, 12],
      ],
    },
  ),
  t(
    'crosswind',
    'Against the Breeze',
    [
      [9, 24, 6, 5],
      [31, 14, 7, 5],
      [59, 6, 6, 5],
    ],
    [
      [22, 6, 2, 14],
      [47, 23, 2, 9],
    ],
    [[34.5, 6.5, 1, 1]],
    'Take the short against-arrow crossing, or go around the band before the partner secures it?',
    'Once reclaimed, the short route becomes equally fast in both directions.',
    {
      currents: [
        ['left', 16, 24, 13, 4],
        ['down', 49, 7, 6, 11],
      ],
    },
  ),
  t(
    'crosswind',
    'Compass Couriers',
    [
      [6, 6, 7, 5],
      [29, 24, 7, 5],
      [45, 13, 6, 5],
      [61, 25, 5, 5],
    ],
    [
      [20, 13, 2, 14],
      [54, 5, 2, 15],
    ],
    [[36.5, 7.5, 1, 1]],
    'Use the upper tailwind to meet at the compass, or develop independent lower returns before exchanging sides?',
    'The compass connection lets each pilot stop on permanent ground before choosing the next arrow.',
    {
      currents: [
        ['right', 15, 6, 13, 4],
        ['up', 38, 20, 5, 11],
        ['right', 47, 23, 11, 4],
      ],
    },
  ),
  t(
    'crosswind',
    'Windbreak Promise',
    [
      [8, 16, 6, 5],
      [29, 5, 6, 5],
      [43, 25, 7, 5],
      [60, 14, 5, 5],
    ],
    [[35, 13, 2, 11]],
    [[20.5, 28.5, 1, -1]],
    'Clear the headwind under the windbreak, or cross above it and leave that work for the partner’s shorter approach?',
    'The cleared headwind is a shared route whose usefulness survives the next capture.',
    {
      currents: [
        ['left', 16, 16, 14, 4],
        ['down', 49, 5, 5, 13],
      ],
    },
  ),
  t(
    'crosswind',
    'Sideways Survey',
    [
      [7, 25, 6, 5],
      [32, 14, 6, 5],
      [58, 6, 7, 5],
    ],
    [
      [20, 6, 2, 15],
      [45, 23, 2, 9],
    ],
    [
      [34.5, 6.5, -1, 1],
      [53.5, 28.5, -1, -1],
    ],
    'Cross the arrows sideways to avoid a headwind, or invest in reclaiming the whole central band?',
    'A sideways approach creates a different safe departure for the partner’s accelerated crossing.',
    {
      currents: [
        ['up', 24, 13, 7, 10],
        ['left', 40, 14, 14, 4],
      ],
    },
  ),
  t(
    'crosswind',
    'Two Long Waves',
    [
      [6, 6, 6, 5],
      [23, 24, 7, 5],
      [44, 5, 6, 5],
      [60, 24, 6, 5],
    ],
    [[34, 12, 2, 14]],
    [
      [13.5, 27.5, 1, -1],
      [56.5, 7.5, -1, 1],
    ],
    'Take separate tailwinds toward the lower landings, or connect the upper pair before neutralizing either band?',
    'The first completed long wave gives the partner ordinary-speed ground for a safe change of direction.',
    {
      currents: [
        ['down', 15, 12, 5, 16],
        ['right', 39, 25, 18, 4],
      ],
    },
  ),
  t(
    'crosswind',
    'Survey Return',
    [
      [8, 7, 6, 5],
      [28, 16, 7, 5],
      [46, 26, 6, 4],
      [59, 6, 6, 5],
    ],
    [
      [20, 22, 2, 10],
      [41, 5, 2, 14],
    ],
    [[35.5, 6.5, 1, 1]],
    'Open a direct survey return through the arrows, or leave the fast lane for a later long enclosure?',
    'Each capture changes which pilot benefits from the remaining directional field.',
    {
      currents: [
        ['down', 16, 6, 5, 13],
        ['left', 37, 21, 17, 4],
      ],
    },
  ),
  t(
    'crosswind',
    'Highland Reunion',
    [
      [6, 16, 6, 5],
      [23, 5, 6, 5],
      [32, 25, 7, 5],
      [49, 13, 6, 5],
      [61, 25, 5, 5],
    ],
    [
      [19, 22, 2, 10],
      [41, 6, 2, 14],
    ],
    [[35.5, 7.5, 1, 1]],
    'Unify the highland landings through three arrow fields, or secure two ordinary-speed returns before the final crossing?',
    'The completed route no longer depends on arrow direction, so either partner can finish from either side.',
    {
      currents: [
        ['right', 13, 16, 13, 4],
        ['up', 29, 10, 5, 11],
        ['down', 56, 12, 4, 16],
      ],
      coverage: 0.68,
    },
  ),

  d(
    'crosswind',
    'Windward Bid',
    [
      [10, 15, 6, 5],
      [33, 5, 7, 5],
      [58, 24, 6, 5],
    ],
    [[27, 21, 2, 11]],
    [[45.5, 8.5, -1, 1]],
    'Take the longer tailwind, or cut the short unmarked northern corner?',
    'The tailwind connection becomes a normal-speed final return after capture.',
    { currents: [['right', 17, 16, 15, 4]] },
  ),
  d(
    'crosswind',
    'Headwind Dividend',
    [
      [31, 14, 7, 6],
      [8, 25, 6, 5],
      [59, 6, 6, 5],
    ],
    [[21, 7, 2, 14]],
    [[44.5, 27.5, -1, -1]],
    'Pay the headwind cost now, or circle the slow direction and reach its far end first?',
    'A reclaimed headwind becomes the shortest approach on the next lap.',
    {
      currents: [
        ['left', 40, 15, 15, 4],
        ['up', 15, 22, 5, 10],
      ],
    },
  ),
  d(
    'crosswind',
    'Compass Cut',
    [
      [8, 6, 6, 5],
      [29, 25, 7, 5],
      [58, 15, 6, 5],
    ],
    [
      [23, 12, 2, 13],
      [45, 6, 2, 12],
    ],
    [[35.5, 7.5, 1, 1]],
    'Use the eastward band to cross early, or enclose the lower compass pocket before committing?',
    'The first capture changes whether the same crossing should be repeated or bypassed.',
    {
      currents: [
        ['right', 15, 7, 16, 4],
        ['down', 48, 14, 5, 15],
      ],
    },
  ),
  d(
    'crosswind',
    'Crosswise Advantage',
    [
      [10, 24, 6, 5],
      [33, 14, 7, 5],
      [59, 5, 6, 5],
    ],
    [[24, 5, 2, 15]],
    [[44.5, 28.5, -1, -1]],
    'Cross the field at right angles, or follow its arrows to the farther landing?',
    'The sideways cut sacrifices acceleration but leaves a shorter trail under pressure.',
    {
      currents: [
        ['up', 18, 21, 12, 7],
        ['left', 41, 14, 15, 4],
      ],
    },
  ),
  d(
    'crosswind',
    'Long Wave Wager',
    [
      [7, 15, 6, 5],
      [29, 6, 6, 5],
      [46, 25, 7, 5],
    ],
    [
      [21, 23, 2, 9],
      [38, 13, 2, 13],
    ],
    [[57.5, 8.5, -1, 1]],
    'Commit to the long wave during the keeper’s retreat, or secure a short refuge before entering it?',
    'The short refuge converts a single risky crossing into two smaller exposures.',
    {
      currents: [
        ['right', 14, 15, 16, 4],
        ['down', 48, 12, 5, 11],
      ],
    },
  ),
  d(
    'crosswind',
    'Highland Finish',
    [
      [8, 5, 6, 5],
      [27, 25, 6, 5],
      [44, 13, 6, 5],
      [60, 24, 6, 5],
    ],
    [
      [20, 12, 2, 14],
      [52, 5, 2, 15],
    ],
    [[34.5, 7.5, 1, 1]],
    'Reclaim both bands to stabilize the final circuit, or use the remaining tailwind for one decisive late bank?',
    'The finishing route depends on which speed field the rival-independent opening removed.',
    {
      currents: [
        ['right', 15, 6, 14, 4],
        ['up', 36, 19, 5, 12],
        ['down', 56, 13, 4, 10],
      ],
      coverage: 0.68,
    },
  ),
]);
