import { boundedJSON, canonicalJSON, exactKeys, required } from '../data-json.mjs';
import { TURN_POLICIES } from '../core/registry.mjs';
import { ENCOUNTER_VARIANTS } from '../hunt/preferences.mjs';
import { encounterVariantSource, placeHuntPopulation } from '../hunt/variants.mjs';
import { encounterVariantManifest } from '../hunt/variant-guidance.mjs';
import { compileMapDesign } from './map.mjs';
import { compileContentProject } from './project.mjs';
import { createCandidateSoloHost } from './solo-host.mjs';
import { createCandidateVersusHost } from './versus-host.mjs';
import { createJourneyVisualThemeIdentityAdapter } from '../presentation/journey-visual-theme-identities.mjs';
import { journeyMissionId } from '../journey/catalog.mjs';
import { publishedSourceAuthority } from './published-journey.mjs';

const sourceEditions = new WeakMap();
function derive(source, variant) {
  if (!sourceEditions.has(source)) sourceEditions.set(source, new Map());
  const editions = sourceEditions.get(source);
  if (!editions.has(variant)) editions.set(variant, encounterVariantSource(source, variant));
  return editions.get(variant);
}
function supports(level, variant) {
  if (!level) return false;
  const rules = level.classic;
  if (variant === 'authored') return true;
  if (level.snake) return false;
  if (variant === 'off') return !rules?.hunt && !rules?.combatPatrols?.enabled;
  if (variant === 'patrol')
    return (
      !rules?.hunt &&
      rules?.combatPatrols?.enabled === true &&
      rules.combatPatrols.actors.length > 0
    );
  return rules?.hunt?.mode === variant && rules.hunt.targets.length > 0;
}
const progressMission = (mission, variant) =>
  !mission
    ? null
    : variant === 'authored'
      ? mission
      : Object.freeze({
          ...mission,
          source: `${mission.source}-encounter-${variant}`,
          id: journeyMissionId({ ...mission, source: `${mission.source}-encounter-${variant}` }),
          authoredMissionId: mission.id,
          encounterVariant: variant,
        });

/** Compile authored content at boot. Additional editions are materialized only
 * for explicit selection or exact-key restoration, and remain owned thereafter. */
function createEncounterHost(source, { getEncounterVariant = () => 'authored', ...options }, mode) {
  // Lazy derivation must never observe later edits to a caller's mutable draft.
  // Frozen publisher snapshots retain their existing visual authority identity.
  const suppliedSource = source;
  source = compileContentProject(source).source;
  const solo = mode === 'solo',
    factory = solo ? createCandidateSoloHost : createCandidateVersusHost;
  const byVariant = new Map(),
    bySource = new Map(),
    records = [],
    byKey = new Map(),
    byOriginal = new Map(),
    owned = new Map(),
    adapters = new Map(),
    errors = {};
  const authoredHost = factory(source, options),
    catalog = authoredHost.catalog;
  const items = [];
  const populationAvailability = new Map();
  const hasPopulation = (mission) => {
    if (populationAvailability.has(mission.id)) return populationAvailability.get(mission.id);
    let available = false;
    try {
      const design = source.missions.find((item) => item.id === mission.levelId);
      const map = source.maps.find(
        (item) => item.id === design.map.id && item.revision === design.map.revision,
      );
      const geometry = compileMapDesign(map).geometry;
      const ordinary = design.actors.filter(
        (actor) => !['optional-scout', 'optional-sentry'].includes(actor.role),
      );
      const spawns = (design.team?.spawnIds ?? [design.spawnId]).map((id) =>
        geometry.spawns.find((spawn) => spawn.id === id),
      );
      available =
        placeHuntPopulation({
          width: map.width,
          height: map.height,
          cells: geometry.cells,
          terrain: geometry.terrain,
          spawns,
          occupied: ordinary,
          count: Math.min(6, 24 - ordinary.length),
        }).length > 0;
    } catch {
      available = false;
    }
    populationAvailability.set(mission.id, available);
    return available;
  };
  const register = (item, variant) => {
    for (const original of solo ? item.host.entries : item.host.rows) {
      const key = canonicalJSON(
        solo
          ? [original.sourcePackId, original.campaignId, original.difficulty, original.executionKey]
          : [original.mission.id, original.difficulty, original.executionKey],
      );
      let record = byKey.get(key);
      if (!record) {
        record = { item, original, variant, variants: [] };
        const view = {
          ...original,
          ...(!solo
            ? {
                key: `${original.key}/encounter-${variant}`,
                mission: catalog.find(original.mission.id),
              }
            : {}),
          encounterVariant: variant,
          get encounterVariants() {
            return Object.freeze([...record.variants]);
          },
        };
        if (solo && variant !== 'authored')
          Object.defineProperty(view, 'manifests', {
            enumerable: true,
            get: () =>
              Object.freeze(
                original.manifests.map((manifest) => encounterVariantManifest(manifest, variant)),
              ),
          });
        const selection = Object.freeze(view);
        record.selection = selection;
        records.push(record);
        byKey.set(key, record);
        owned.set(selection, record);
      }
      if (!record.variants.includes(variant)) record.variants.push(variant);
      byOriginal.set(original, record);
    }
  };
  const authored = {
    source: publishedSourceAuthority(suppliedSource) ? suppliedSource : source,
    host: authoredHost,
  };
  byVariant.set('authored', authored);
  bySource.set(canonicalJSON(source), authored);
  items.push(authored);
  register(authored, 'authored');
  const ensureVariant = (variant) => {
    required(ENCOUNTER_VARIANTS.includes(variant), 'Choose an explicit encounter variant.');
    if (byVariant.has(variant)) return byVariant.get(variant);
    if (Object.hasOwn(errors, variant)) return null;
    try {
      const derived = derive(source, variant),
        key = canonicalJSON(derived);
      let item = bySource.get(key);
      if (!item) {
        item = { source: derived, host: factory(derived, options) };
        bySource.set(key, item);
        items.push(item);
      }
      byVariant.set(variant, item);
      register(item, variant);
      return item;
    } catch (error) {
      errors[variant] = String(error.message);
      return null;
    }
  };
  const selectedVariant = () => {
    const variant = getEncounterVariant();
    required(ENCOUNTER_VARIANTS.includes(variant), 'Choose an explicit encounter variant.');
    return variant;
  };
  const levelFor = (selection, mission) =>
    solo
      ? selection?.campaign.levels.find((level) => level.id === mission.levelId)
      : selection?.level;
  const selectVariant = (mission, difficulty, variant) => {
    if (catalog.find(mission?.id) !== mission) return null;
    const item = ensureVariant(variant);
    if (!item) return null;
    const inner = item.host.catalog.find(mission.id);
    const original = solo ? item.host.select(inner, difficulty) : item.host.row(inner, difficulty);
    return supports(levelFor(original, mission), variant)
      ? (byOriginal.get(original)?.selection ?? null)
      : null;
  };
  const select = (mission, difficulty, { selection } = {}) => {
    if (selection !== undefined) {
      required(owned.has(selection), 'Preserve only an owned encounter selection.');
      const owner = solo
        ? { packId: selection.sourcePackId, campaignId: selection.campaignId }
        : selection.mission;
      if (owner.packId !== mission?.packId || owner.campaignId !== mission?.campaignId) return null;
    }
    const variant = selection?.encounterVariant ?? selectedVariant();
    return (
      selectVariant(mission, difficulty, variant) ?? selectVariant(mission, difficulty, 'authored')
    );
  };
  const availableVariants = (mission) => {
    if (catalog.find(mission?.id) !== mission) return Object.freeze([]);
    const original = authoredHost[solo ? 'select' : 'row'](mission, 'standard'),
      level = levelFor(original, mission);
    if (level?.snake) return Object.freeze(['authored']);
    return Object.freeze(
      ENCOUNTER_VARIANTS.filter((variant) => {
        if (Object.hasOwn(errors, variant)) return false;
        if (byVariant.has(variant)) return !!selectVariant(mission, 'standard', variant);
        // Inspect the exact generated placement on this map without compiling all
        // six project editions. Walls, closed gates and lethal terrain constrain it.
        if (variant === 'off') return true;
        return (
          /^xonix-level\.v[5-9]$/.test(level?.version) &&
          hasPopulation(mission) &&
          (variant === 'patrol' ||
            level.encounter === null ||
            level.encounter?.version === 'xonix-encounter.v2')
        );
      }),
    );
  };
  const findExecution = (key) =>
    records.find((record) => record.selection.executionKey === key)?.selection ?? null;
  const ensureExecution = (key) => {
    if (findExecution(key)) return findExecution(key);
    if (
      typeof key !== 'string' ||
      key.length > 512 ||
      !catalog.missions.some((mission) => key.startsWith(`${mission.campaignId}/`))
    )
      return null;
    for (const variant of ENCOUNTER_VARIANTS) {
      ensureVariant(variant);
      const selection = findExecution(key);
      if (selection) return selection;
    }
    return null;
  };
  const resolveProgress = (id) => {
    const ordinary = catalog.find(id);
    if (ordinary) return { mission: ordinary, variant: 'authored' };
    if (typeof id !== 'string') return null;
    for (const variant of ENCOUNTER_VARIANTS.filter((value) => value !== 'authored')) {
      const mission = catalog.find(id.replace(`candidate-encounter-${variant}/`, 'candidate/'));
      if (mission && progressMission(mission, variant).id === id) return { mission, variant };
    }
    return null;
  };
  const selectProgress = (id, difficulty) => {
    const record = resolveProgress(id);
    const selection = record && selectVariant(record.mission, difficulty, record.variant);
    return selection && progressMission(record.mission, selection.encounterVariant).id === id
      ? selection
      : null;
  };
  const missionForSelection = (selection, index) => {
    const record = owned.get(selection);
    if (!record) return null;
    if (!solo) return selection.mission;
    const mission = record.item.host.mission(record.original, index);
    return mission ? catalog.find(mission.id) : null;
  };
  const facade = {
    catalog,
    get variantErrors() {
      return Object.freeze({ ...errors });
    },
    owns: (selection) => owned.has(selection),
    availableVariants,
    ensureVariant: (variant) => !!ensureVariant(variant),
    ensureExecution,
    progressMission: (selection, index) =>
      progressMission(missionForSelection(selection, index), selection?.encounterVariant),
    resolveProgressMission(id) {
      const record = resolveProgress(id);
      return record ? progressMission(record.mission, record.variant) : null;
    },
    selectProgress,
    card(mission, difficulty = 'standard', controls) {
      const selection = select(mission, difficulty, controls),
        record = owned.get(selection);
      if (!record) return null;
      const inner = record.item.host.catalog.find(mission.id),
        card = record.item.host.card(inner, difficulty);
      if (!card || record.variant === 'authored') return card;
      const manifest = solo
        ? selection.manifests.find((item) => item.missionId === mission.levelId)
        : encounterVariantManifest(record.item.host.manifest(inner, difficulty), record.variant);
      return card && manifest
        ? Object.freeze({
            ...card,
            route: manifest.design.routeDecision,
            mastery: manifest.design.mastery,
          })
        : card;
    },
    visualThemeSelection(selection, level) {
      const record = owned.get(selection);
      return record?.item.host.visualThemeSelection(record.original, level) ?? null;
    },
    async prepareVisualIdentity({ selection, level, association }, controls = {}) {
      const record = owned.get(selection);
      required(record, 'Use an owned encounter selection.');
      const item = record.item;
      if (!adapters.has(item))
        adapters.set(item, createJourneyVisualThemeIdentityAdapter(item.source, { mode }));
      return (await adapters.get(item)).prepareHostSelection(
        { host: item.host, selection: record.original, level, association },
        controls,
      );
    },
    isCore: authoredHost.isCore,
    isOptionalSequence: authoredHost.isOptionalSequence,
    next: authoredHost.next,
  };
  // Materialize the persisted explicit choice once, before the caller snapshots
  // the current rows. As-designed startup does no speculative variant work.
  ensureVariant(selectedVariant());
  if (!solo)
    return Object.freeze({
      ...facade,
      get variantErrors() {
        return Object.freeze({ ...errors });
      },
      get rows() {
        return Object.freeze(records.map((record) => record.selection));
      },
      row: select,
      manifest(mission, difficulty = 'standard', controls) {
        const selection = select(mission, difficulty, controls),
          record = owned.get(selection);
        return record
          ? encounterVariantManifest(
              record.item.host.manifest(record.item.host.catalog.find(mission.id), difficulty),
              record.variant,
            )
          : null;
      },
    });
  let prepared = null,
    preparedOwner = null,
    disposed = false,
    generation = 0;
  const cancel = () => {
    const ticket = ++generation;
    prepared = preparedOwner = null;
    for (const item of items) {
      item.host.preparer.cancel();
      if (generation !== ticket) return;
    }
  };
  const preparer = Object.freeze({
    async prepare(request, controls) {
      required(!disposed, 'Encounter candidate preparer is disposed.');
      const selected = boundedJSON(request, { maxBytes: 8192, maxNodes: 16, maxDepth: 1 });
      exactKeys(
        selected,
        ['missionId', 'difficulty', 'seed', 'turnPolicy', 'executionKey'],
        'encounter candidate attempt',
      );
      const mission = catalog.find(selected.missionId);
      required(mission, 'Choose an owned encounter mission.');
      required(
        Number.isInteger(selected.seed) && selected.seed >= 0 && selected.seed <= 0xffffffff,
        'Candidate seed must be an unsigned 32-bit integer.',
      );
      required(
        TURN_POLICIES.includes(selected.turnPolicy),
        'Unsupported candidate steering policy.',
      );
      if (selected.executionKey !== undefined) ensureExecution(selected.executionKey);
      const entry =
        selected.executionKey === undefined
          ? select(mission, selected.difficulty)
          : records
              .map((record) => record.selection)
              .find(
                (entry) =>
                  entry.sourcePackId === mission.packId &&
                  entry.campaignId === mission.campaignId &&
                  entry.executionKey === selected.executionKey &&
                  entry.difficulty === selected.difficulty,
              );
      required(entry, 'Choose the exact owned encounter execution.');
      if (controls?.signal?.aborted)
        throw new DOMException('Candidate preparation cancelled.', 'AbortError');
      const ticket = generation + 1;
      cancel();
      if (disposed || generation !== ticket)
        throw new DOMException('Candidate preparation cancelled.', 'AbortError');
      const owner = owned.get(entry).item.host,
        { executionKey: _key, ...inner } = selected;
      const result = await owner.preparer.prepare(inner, controls);
      required(
        !disposed && generation === ticket && owner.preparer.current(result),
        'Encounter preparation was replaced.',
      );
      prepared = result;
      preparedOwner = owner;
      return result;
    },
    cancel,
    current: (value) =>
      !disposed && value != null && prepared === value && preparedOwner.preparer.current(value),
    take(value) {
      required(
        !disposed && value != null && prepared === value,
        'Encounter candidate is no longer current.',
      );
      const owner = preparedOwner;
      prepared = preparedOwner = null;
      return owner.preparer.take(value);
    },
    dispose() {
      disposed = true;
      generation++;
      prepared = preparedOwner = null;
      for (const item of items) item.host.preparer.dispose();
    },
  });
  return Object.freeze({
    ...facade,
    get variantErrors() {
      return Object.freeze({ ...errors });
    },
    get entries() {
      return Object.freeze(records.map((record) => record.selection));
    },
    select,
    mission: missionForSelection,
    preparer,
  });
}
export function createEncounterSoloHost(source, options = {}) {
  return createEncounterHost(source, options, 'solo');
}
export function createEncounterVersusHost(source, options = {}) {
  return createEncounterHost(source, options, 'versus');
}
