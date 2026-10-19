import { freezeDesign } from './catalogs.mjs';
import { MULTIPLAYER_WAVE_ONE_LAYOUTS } from './multiplayer-wave-one.mjs';
import { MULTIPLAYER_WAVE_TWO_LAYOUTS } from './multiplayer-wave-two.mjs';
import { MULTIPLAYER_WAVE_THREE_LAYOUTS } from './multiplayer-wave-three.mjs';

// Authored in cells, not seeded permutations. Each row owns its route decision.
// Compact rectangles are [x, y, width, height]; points are [x, y].
export const MULTIPLAYER_EXPANSION_CHAPTERS = freezeDesign([
  { id: 'harbors', name: 'Horizon Harbors', theme: 'horizon', mechanic: 'foundations', band: 2 },
  { id: 'gardens', name: 'Signal Gardens', theme: 'signal', mechanic: 'terrain', band: 3 },
  { id: 'switchyards', name: 'Neon Switchyards', theme: 'neon', mechanic: 'walls', band: 4 },
  { id: 'docks', name: 'Rover Docks', theme: 'rover', mechanic: 'reclaimed-roamer', band: 4 },
  {
    id: 'phaseworks',
    name: 'Phaseworks Observatory',
    theme: 'phase',
    mechanic: 'trail-impacts',
    band: 5,
  },
  {
    id: 'livewire',
    name: 'Livewire Foundry',
    theme: 'livewire',
    mechanic: 'lane-warning',
    band: 6,
  },
  { id: 'relay', name: 'Relay Archive', theme: 'relay', mechanic: 'relay-connectors', band: 6 },
  {
    id: 'crosswind',
    name: 'Crosswind Highlands',
    theme: 'crosswind',
    mechanic: 'directional-fields',
    band: 7,
  },
  { id: 'border', name: 'Border Watch', theme: 'border', mechanic: 'perimeter-patrol', band: 7 },
  { id: 'fracture', name: 'Fractured Coast', theme: 'fracture', mechanic: 'erosion', band: 8 },
  {
    id: 'sentinel',
    name: 'Sentinel Citadel',
    theme: 'sentinel',
    mechanic: 'staged-targets',
    band: 9,
  },
  { id: 'aurora', name: 'Apex Aurora', theme: 'apex', mechanic: 'combined-mastery', band: 10 },
]);

export const MULTIPLAYER_EXPANSION_LAYOUTS = freezeDesign([
  {
    id: 'harbor-handoff',
    name: 'Harbor Handoff',
    chapter: 'harbors',
    mode: 'team',
    foundations: [
      [9, 6, 6, 5],
      [28, 13, 5, 5],
      [45, 21, 6, 5],
      [60, 27, 5, 5],
    ],
    walls: [[38, 5, 2, 9]],
    spawns: [
      [11.5, 8.5],
      [62.5, 29.5],
    ],
    keepers: [
      [53.5, 9.5, -1, 1],
      [20.5, 27.5, 1, -1],
    ],
    coverage: 0.56,
    decision:
      'Join the diagonal islands through the middle, or bank separate bays from the outside rails?',
    consequence:
      'A middle connection gives the other pilot a short return across the opposite bay.',
    moment: 'The second pilot closes onto the diagonal line the first pilot just secured.',
    mastery: 'Each pilot uses a return created by their partner before the shared clear.',
  },
  {
    id: 'garden-exchange',
    name: 'Garden Exchange',
    chapter: 'gardens',
    mode: 'team',
    foundations: [
      [8, 14, 6, 7],
      [31, 5, 8, 4],
      [34, 26, 8, 4],
      [59, 14, 5, 7],
    ],
    walls: [
      [26, 13, 2, 9],
      [44, 11, 2, 8],
    ],
    spawns: [
      [10.5, 17.5],
      [61.5, 17.5],
    ],
    terrain: [
      ['slow', 15, 9, 9, 15],
      ['lethal', 47, 10, 7, 6],
      ['slow', 46, 22, 10, 5],
    ],
    keepers: [
      [35.5, 17.5, 1, 1],
      [56.5, 7.5, -1, 1],
    ],
    coverage: 0.56,
    decision:
      'Clear the slow western garden first, or link the upper bank to bypass the dangerous eastern bed?',
    consequence:
      'Neutralizing the western garden creates a full-speed shared return; the upper link opens a different route for the eastern pilot.',
    moment: 'A difficult crossing becomes the partner’s safest route home.',
    mastery: 'Neutralize one bed each and exchange sides without a knockdown.',
  },
  {
    id: 'switchyard-rendezvous',
    name: 'Switchyard Rendezvous',
    chapter: 'switchyards',
    mode: 'team',
    foundations: [
      [7, 25, 6, 5],
      [32, 15, 8, 5],
      [59, 6, 6, 5],
    ],
    walls: [
      [20, 4, 2, 15],
      [20, 19, 9, 2],
      [49, 17, 2, 15],
      [42, 15, 9, 2],
    ],
    spawns: [
      [9.5, 27.5],
      [61.5, 8.5],
    ],
    keepers: [
      [13.5, 9.5, 1, 1],
      [57.5, 26.5, -1, -1],
    ],
    coverage: 0.58,
    decision:
      'Meet at the central island through the open diagonal, or reclaim a chamber around a wall tip first?',
    consequence:
      'The central bank supports both chamber approaches; an outer bank gives the partner a safer wall-tip return.',
    moment: 'Two routes around opposite corners meet at one shared launch island.',
    mastery: 'Use both sides of the central island and let both pilots close a chamber.',
  },
  {
    id: 'dockside-wake',
    name: 'Dockside Wake',
    chapter: 'docks',
    mode: 'team',
    foundations: [
      [7, 7, 7, 5],
      [8, 26, 6, 5],
      [34, 15, 5, 6],
      [57, 24, 8, 5],
    ],
    walls: [
      [24, 6, 3, 13],
      [47, 17, 3, 13],
    ],
    spawns: [
      [10.5, 9.5],
      [60.5, 26.5],
    ],
    keepers: [
      [56.5, 8.5, -1, 1],
      [20.5, 24.5, 1, -1],
    ],
    rovers: [[33.5, 9.5, 1, 0]],
    coverage: 0.58,
    decision:
      'Connect the central dock before waking its rover, or establish the lower return first?',
    consequence:
      'The lower connection leaves the partner an escape after the rover activates on reclaimed ground.',
    moment: 'A newly awakened rover makes the spare connection immediately useful.',
    mastery: 'Wake the rover only after both pilots have two possible returns.',
  },
  {
    id: 'harbor-gambit',
    name: 'Harbor Gambit',
    chapter: 'harbors',
    mode: 'versus',
    foundations: [
      [17, 8, 5, 4],
      [42, 20, 7, 4],
    ],
    walls: [[32, 26, 2, 6]],
    spawns: [[19.5, 0.5]],
    keepers: [[58.5, 27.5, -1, -1]],
    coverage: 0.54,
    decision: 'Bank two short island returns, or risk one longer enclosure around the eastern bay?',
    consequence:
      'The early island bank shortens the second cut; the long opening can reach the goal sooner but exposes more trail.',
    moment: 'A cautious opening catches a rival’s larger attempt on the final return.',
    mastery: 'Find a clear using each of the two opening plans.',
  },
  {
    id: 'signal-shortcut',
    name: 'Signal Shortcut',
    chapter: 'gardens',
    mode: 'versus',
    foundations: [
      [22, 14, 6, 5],
      [48, 7, 5, 5],
    ],
    walls: [[39, 21, 2, 10]],
    terrain: [
      ['slow', 12, 6, 7, 18],
      ['lethal', 31, 8, 8, 5],
    ],
    spawns: [[24.5, 16.5]],
    keepers: [[59.5, 25.5, -1, -1]],
    coverage: 0.55,
    decision:
      'Neutralize the slow western strip for a direct return, or take the longer clear route below it?',
    consequence:
      'The first bank changes the travel cost of the next enclosure without changing either rival’s rules.',
    moment: 'The shortcut becomes safe only after a deliberate enclosure.',
    mastery: 'Win a race after neutralizing a material strip.',
  },
  {
    id: 'neon-fork',
    name: 'Neon Fork',
    chapter: 'switchyards',
    mode: 'versus',
    foundations: [
      [33, 13, 6, 6],
      [9, 24, 5, 5],
    ],
    walls: [
      [22, 6, 2, 15],
      [24, 6, 11, 2],
      [47, 16, 2, 14],
      [49, 28, 11, 2],
    ],
    spawns: [[35.5, 15.5]],
    keepers: [
      [56.5, 7.5, -1, 1],
      [13.5, 12.5, 1, 1],
    ],
    coverage: 0.56,
    decision:
      'Enclose the north-east opening first, or bank the lower island before approaching the western chamber?',
    consequence: 'Your chamber order changes which wall tip is exposed on the next return.',
    moment: 'The last enclosure crosses a lane created by the first.',
    mastery: 'Complete both chamber orders on equal starting settings.',
  },
  {
    id: 'rover-reserve',
    name: 'Rover Reserve',
    chapter: 'docks',
    mode: 'versus',
    foundations: [
      [11, 12, 5, 7],
      [35, 24, 6, 4],
      [58, 9, 5, 5],
    ],
    walls: [
      [29, 7, 2, 11],
      [46, 21, 3, 11],
    ],
    spawns: [[13.5, 15.5]],
    keepers: [[53.5, 18.5, -1, 1]],
    rovers: [[26.5, 25.5, 1, 0]],
    coverage: 0.58,
    decision:
      'Take the lower bank and wake its rover early, or build a reserve return across the upper islands?',
    consequence:
      'An early lower enclosure earns ground but puts a rover on your next approach; the upper route preserves a second landing.',
    moment: 'The winning final return uses the landing saved at the start.',
    mastery: 'Finish after waking the rover without losing a life.',
  },
  ...MULTIPLAYER_WAVE_ONE_LAYOUTS,
  ...MULTIPLAYER_WAVE_TWO_LAYOUTS,
  ...MULTIPLAYER_WAVE_THREE_LAYOUTS,
]);
