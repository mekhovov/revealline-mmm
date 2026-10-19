// Authored company encounters use the same finite actor recipes, relay gates,
// directional fields and shield-relay encounter as the current main Journey.
// These are content successors; the historical Portuguese pilot is not changed.
const within = (x, y, rect) =>
  x >= rect.x && y >= rect.y && x < rect.x + rect.w && y < rect.y + rect.h;
const blocked = (map, x, y, extra = []) =>
  x < 1 ||
  y < 1 ||
  x >= map.width - 1 ||
  y >= map.height - 1 ||
  [...map.walls, ...map.foundations, ...(map.gates ?? []), ...extra].some((rect) =>
    within(x, y, rect),
  );
const available = (map, point) => !blocked(map, point.x, point.y);

function point(map, preferred, occupied = []) {
  for (let distance = 0; distance < map.width + map.height; distance++)
    for (let y = 2; y < map.height - 2; y++)
      for (let x = 2; x < map.width - 2; x++) {
        if (Math.abs(x - preferred[0]) + Math.abs(y - preferred[1]) !== distance) continue;
        const candidate = { x: x + 0.5, y: y + 0.5 };
        if (
          available(map, candidate) &&
          occupied.every((other) => Math.hypot(other.x - candidate.x, other.y - candidate.y) >= 3)
        )
          return candidate;
      }
  throw new Error('Company encounter needs a clear field position.');
}

function frontier(map) {
  for (const foundation of map.foundations)
    for (let y = foundation.y; y < foundation.y + foundation.h; y++)
      if (!blocked(map, foundation.x - 1, y)) return { x: foundation.x - 1, y, side: 'east' };
  throw new Error('Company encounter needs a visible frontier.');
}

/** A closed numbered connector spans a real gap between existing safe
 * surfaces. Capturing its objective opens that return without another fill. */
function connector(map, id, occupied = []) {
  const candidates = [];
  for (const foundation of map.foundations)
    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ]) {
      const x =
        dx < 0
          ? foundation.x - 1
          : dx > 0
            ? foundation.x + foundation.w
            : foundation.x + Math.floor(foundation.w / 2);
      const y =
        dy < 0
          ? foundation.y - 1
          : dy > 0
            ? foundation.y + foundation.h
            : foundation.y + Math.floor(foundation.h / 2);
      let cx = x,
        cy = y,
        length = 0;
      while (
        !blocked(map, cx, cy) &&
        !occupied.some((p) => Math.floor(p.x) === cx && Math.floor(p.y) === cy)
      ) {
        length++;
        cx += dx;
        cy += dy;
      }
      const safeEnd =
        cx === 0 ||
        cy === 0 ||
        cx === map.width - 1 ||
        cy === map.height - 1 ||
        map.foundations.some((rect) => within(cx, cy, rect));
      if (length < 3 || length > 24 || !safeEnd) continue;
      candidates.push({
        id,
        x: Math.min(x, x + dx * (length - 1)),
        y: Math.min(y, y + dy * (length - 1)),
        w: dx ? length : 1,
        h: dy ? length : 1,
      });
    }
  candidates.sort((a, b) => a.w * a.h - b.w * b.h || a.x - b.x || a.y - b.y);
  if (!candidates.length) throw new Error('Company relay needs a legal connecting gap.');
  return candidates[0];
}

function flow(map, id, direction, preferred) {
  const vertical = ['up', 'down'].includes(direction),
    w = vertical ? 3 : 7,
    h = vertical ? 7 : 3;
  const candidates = [];
  for (let y = 2; y + h < map.height - 1; y++)
    for (let x = 2; x + w < map.width - 1; x++) {
      let clear = true;
      for (let cy = y; clear && cy < y + h; cy++)
        for (let cx = x; cx < x + w; cx++)
          if (blocked(map, cx, cy, [...map.terrain, ...(map.speedZones ?? [])])) {
            clear = false;
            break;
          }
      if (clear) candidates.push({ id, x, y, w, h, direction });
    }
  candidates.sort(
    (a, b) =>
      Math.abs(a.x - preferred[0]) +
        Math.abs(a.y - preferred[1]) -
        Math.abs(b.x - preferred[0]) -
        Math.abs(b.y - preferred[1]) ||
      a.y - b.y ||
      a.x - b.x,
  );
  if (!candidates.length) throw new Error('Company route needs a clear directional field.');
  return candidates[0];
}

export function companyChallengeStage(brandId, campaignIndex) {
  return [
    { stage: 1, band: 1 },
    { stage: 2, band: 4 },
    { stage: 3, band: 6 },
    { stage: 4, band: 8 },
    { stage: 6, band: 11 },
  ][campaignIndex];
}

/** Mutates only a fresh factory-owned mission/map pair before compilation. */
export function authorCompanyProgression(mission, map, { stage, band }, ordinal) {
  if (stage <= 1) return mission;
  const late = ordinal >= 4,
    final = ordinal === 6;
  const introductions = {
    2: { 1: 'frontier-patrol', 4: 'reclaimed-roamer' },
    3: { 1: 'territory-eroder' },
    4: { 1: 'trail-pursuer', 3: 'heading-interceptor', 4: 'lane-emitter', 6: 'relay-gates' },
    5: { 1: 'relay-gates', 6: 'directional-fields' },
    6: { 1: 'directional-fields', 4: 'shield-relay-sentinel' },
  };
  mission.revision = String(Number(mission.revision) + 1);
  map.revision = '2';
  mission.map.revision = map.revision;
  const mechanics = ['foundations', 'enemy-seeded-closure', 'travelling-trail-impact'];
  const instructions = [];
  const positioned = [];
  const moving = (id, role, preferred, heading = [-1, -1]) => {
    const placement = point(map, preferred, positioned);
    positioned.push(placement);
    return { id, role, tier: 'measured', ...placement, heading };
  };
  const stationary = (id, role, preferred, extras = {}) => {
    const placement = point(map, preferred, positioned);
    positioned.push(placement);
    return { id, role, tier: 'measured', ...placement, ...extras };
  };
  const addFrontier = () => {
    mission.actors.push({
      id: 'moving-boundary',
      role: 'frontier-patrol',
      tier: 'measured',
      edge: frontier(map),
      clockwise: ordinal % 2 === 0,
    });
    mechanics.push('frontier-patrol');
    instructions.push(
      'Frontier patrols follow the changed boundary after capture; check the return edge before departing.',
    );
  };
  mission.actors = [moving('paper-drifter', 'field-keeper', [61, 28])];
  mission.objectives = [
    { id: 'connection', ...point(map, [12, 8], positioned), required: true, hidden: false },
  ];
  if (stage >= 3 || late)
    mission.objectives.push({
      id: 'handoff',
      ...point(map, [55, 25], [...positioned, ...mission.objectives]),
      required: true,
      hidden: false,
    });
  if (stage === 2) {
    addFrontier();
    mission.actors.push(moving('second-drifter', 'field-keeper', [13, 26], [1, -1]));
    if (late) {
      mission.actors.push(moving('sleeping-backlog', 'reclaimed-roamer', [35, 9], [0, 1]));
      mechanics.push('reclaimed-roamer');
      instructions.push(
        'A dormant backlog knot wakes only after you reclaim its whole body; leave its warning area before using the new ground.',
      );
    }
  } else if (stage === 3) {
    mission.actors.push(moving('sleeping-backlog', 'reclaimed-roamer', [35, 9], [0, 1]));
    mission.actors.push(moving('rework-drift', 'territory-eroder', [15, 27], [1, -1]));
    mechanics.push('reclaimed-roamer', 'territory-eroder');
    if (late) addFrontier();
    instructions.push(
      'Rework can erode reclaimed ground. Protect a second return and watch the dormant knot wake after capture.',
    );
  } else if (stage === 4) {
    mission.actors.push(
      moving(
        'locked-demand',
        ordinal >= 3 ? 'heading-interceptor' : 'trail-pursuer',
        [13, 27],
        [1, -1],
      ),
    );
    mechanics.push(ordinal >= 3 ? 'heading-interceptor' : 'trail-pursuer');
    instructions.push(
      ordinal >= 3
        ? 'The interceptor commits to one observed heading after its warning. Change your route after the lock and close on the nearer return.'
        : 'The pursuer commits to one observed point on the unfinished trail. Keep a short return ready and close before its finite approach reaches you.',
    );
    if (late) {
      mission.actors.push(
        stationary('scheduled-wave', 'lane-emitter', [56, 27], {
          axis: ordinal === 5 ? 'vertical' : 'horizontal',
        }),
      );
      mechanics.push('lane-emitter');
      instructions.push(
        'The marked lane warns before firing; close the whole exposed line before the pulse, not only the craft.',
      );
    }
  } else if (stage === 5) {
    mission.actors.push(moving('second-drifter', 'field-keeper', [13, 27], [1, -1]));
    if (late)
      mission.actors.push(
        stationary('scheduled-wave', 'lane-emitter', [57, 27], { axis: 'horizontal' }),
      );
    else addFrontier();
    if (late) mechanics.push('lane-emitter');
  } else if (stage === 6) {
    if (late) {
      const sentinel = stationary('shared-core', 'relay-sentinel', [55, 17]);
      mission.actors = [sentinel];
      mission.objectives = [
        { id: 'connection', ...point(map, [12, 8], [sentinel]), required: true, hidden: false },
      ];
      if (ordinal >= 5)
        mission.objectives.push({
          id: 'handoff',
          ...point(map, [47, 27], [sentinel, ...mission.objectives]),
          required: true,
          hidden: false,
        });
      const shieldObjectiveIds = mission.objectives.map((item) => item.id);
      mission.objectives.push({
        id: 'core',
        x: sentinel.x,
        y: sentinel.y,
        required: true,
        hidden: false,
      });
      mission.encounter = {
        recipeId: 'shield-relays-v1',
        enemyId: sentinel.id,
        shieldObjectiveIds,
        coreObjectiveId: 'core',
      };
      mechanics.push('shield-relay-sentinel');
      instructions.push(
        'Capture every shield relay. After the vertical core attack, close eight fresh trail cells during CORE OPEN or isolate the core; release secures the remaining field.',
      );
      if (final) addFrontier();
    } else {
      mission.actors.push(
        stationary('scheduled-wave', 'lane-emitter', [57, 27], {
          axis: ordinal === 2 ? 'vertical' : 'horizontal',
        }),
      );
      mechanics.push('lane-emitter');
      instructions.push(
        'Plan a complete return around the lane warning before committing to the marked flow.',
      );
    }
  }
  const relayCount =
    stage === 5
      ? late
        ? 2
        : 1
      : stage === 4 && final
        ? 1
        : stage === 6 && ordinal >= 5
          ? final
            ? 2
            : 1
          : 0;
  // The canonical campaign execution identity has one simulation version. Its
  // early lessons use explicit empty collections for mechanics introduced later.
  if (stage >= 4) {
    const directional = stage >= 5;
    map.format = directional ? 'MapDesignV3' : 'MapDesignV2';
    mission.format =
      stage === 6 ? 'MissionDesignV4' : directional ? 'MissionDesignV3' : 'MissionDesignV2';
    if (stage === 6) mission.encounter ??= null;
    map.gates = [];
    mission.relayLinks = [];
    for (let i = 0; i < relayCount; i++) {
      const gate = connector(map, `return-${i + 1}`, [...positioned, ...mission.objectives]);
      map.gates.push(gate);
      mission.relayLinks.push({ gateId: gate.id, objectiveId: mission.objectives[i].id });
    }
    if (relayCount) {
      mechanics.push('relay-gates');
      instructions.push(
        'Each numbered objective opens its matching connector. Closed connectors block a cut; open ones become safe returns without another fill.',
      );
    }
    if (directional) {
      map.speedZones = [];
      if ((stage === 6 && !late) || final) {
        map.speedZones.push(flow(map, 'outbound-flow', 'down', [24, 8]));
        map.speedZones.push(flow(map, 'return-flow', 'right', [41, 24]));
        mechanics.push('directional-fields');
        instructions.push(
          'Arrows speed travel with the flow and slow opposite travel in unclaimed field. Capture neutralizes them.',
        );
      }
    }
  }
  // Gate reservations may alter the first legal frontier, but never actor positions.
  for (const actor of mission.actors)
    if (actor.role === 'frontier-patrol') actor.edge = frontier(map);
  mission.coverage =
    stage === 6 && late ? 0.82 : Math.min(0.79, mission.coverage + 0.05 + stage * 0.012);
  mission.design = {
    ...mission.design,
    routeDecision: `${mission.design.routeDecision} ${stage === 6 && late ? 'Connect the shield relays before committing to the exposed shared core.' : relayCount ? 'Choose which numbered relay will open the most useful return connector first.' : stage === 6 ? 'Choose the flow direction that reaches a return before the next lane pulse.' : stage === 4 ? 'Keep a second return ready before the warning locks your trail or heading.' : stage === 3 ? 'Keep another return available when capture wakes a knot or rework erodes the edge.' : 'Read the moving boundary before committing to the next connection.'}`,
    lesson: `${mission.design.lesson} ${instructions[0]}`,
    counterplay: instructions.join(' '),
    captureConsequence: `${relayCount ? 'The captured relay opens its matching return. ' : ''}${stage === 3 ? 'A capture may wake a roamer and gives an eroder more reclaimed edge. ' : ''}${stage === 6 && late ? 'Shield capture advances the shared core encounter; only its release secures the remaining picture. ' : ''}This fictional reveal never changes a business record or a real-world delivery.`,
    introduces: introductions[stage]?.[ordinal] ? [introductions[stage][ordinal]] : [],
    practices: [...new Set(mechanics)],
    combines: late ? [...new Set(mechanics.slice(3))] : [],
    mastery:
      'Connect every required objective and complete the encounter without losing a life; optional learning remains separate from arcade progress.',
    durationSeconds: stage >= 5 ? [70, 240] : [50, 210],
    difficulty: {
      band: band + Number(late),
      planning: band + Number(late),
      execution: Math.max(2, band - 1),
      threatDensity: mission.actors.length,
      timePressure: 0,
      mechanicLoad: Math.min(12, band + Number(late)),
      coordination: 0,
    },
  };
  return mission;
}
