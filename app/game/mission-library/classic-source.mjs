import { boundedJSON } from '../data-json.mjs';
import { classifyContent } from '../content-design/content-lifecycle.mjs';
import {
  CLASSIC_RULES_CURRENT,
  CLASSIC_RULES_ORIGINAL,
  classicRulesCampaignIdentity,
  supportsClassicCurrentRules,
} from './classic-current-rules.mjs';
import { classicMissionPresentation, classicMissionDetails } from './classic-presentation.mjs';
import { canonicalMissionLevelKey, officialLevelNumber } from '../level-numbering.mjs';

const SOURCES = ['base', 'bundled', 'archived', 'optional', 'external'];
const digest = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);

/** The build verifies this index against every original source. Reading its
 * bounded metadata never downloads or validates a playable pack. Host adapters
 * must resolve and validate exact runtime/presentation ownership before Play. */
export function prepareMissionLibraryIndex(value) {
  const index = boundedJSON(value, {
    maxBytes: 512 * 1024,
    maxNodes: 50000,
    maxArray: 4096,
    maxDepth: 12,
    maxString: 2048,
  });
  if (index.format !== 'revealline-mission-library-index.v1' || !Array.isArray(index.missions))
    throw new TypeError('Unsupported mission library index.');
  const ids = new Set();
  const nonempty = (value) => typeof value === 'string' && value.length > 0;
  for (const row of index.missions) {
    if (
      !row ||
      !SOURCES.includes(row.source) ||
      !nonempty(row.id) ||
      ids.has(row.id) ||
      !nonempty(row.campaignKey) ||
      !nonempty(row.campaignId) ||
      !nonempty(row.levelId) ||
      !nonempty(row.name) ||
      !nonempty(row.campaignTitle) ||
      !nonempty(row.edition) ||
      !digest(row.sourceFile?.sha256) ||
      !Number.isSafeInteger(row.sourceFile?.bytes) ||
      row.sourceFile.bytes <= 0 ||
      !Array.isArray(row.modes) ||
      !row.modes.length ||
      row.modes.some((mode) => !['solo', 'versus'].includes(mode)) ||
      row.modes.some(
        (mode) =>
          !Array.isArray(row.difficultiesByMode?.[mode]) ||
          !row.difficultiesByMode[mode].length ||
          row.difficultiesByMode[mode].some(
            (preset) => !['standard', 'gentle', 'expert'].includes(preset),
          ),
      ) ||
      !Array.isArray(row.tags) ||
      !row.tags.includes('Classic') ||
      !Number.isInteger(row.levelIndex) ||
      row.levelIndex < 0 ||
      (row.source === 'base' ? row.packId !== null : !nonempty(row.packId)) ||
      (row.source !== 'base' &&
        (!digest(row.packIdentity?.sha256) ||
          !Number.isSafeInteger(row.packIdentity?.bytes) ||
          row.packIdentity.bytes <= 0)) ||
      (row.download &&
        (row.download.id !== row.packId ||
          !Number.isSafeInteger(row.download.bytes) ||
          row.download.bytes < row.sourceFile.bytes))
    )
      throw new TypeError('Invalid or duplicate Classic mission metadata.');
    ids.add(row.id);
  }
  const freeze = (item) => {
    if (item && typeof item === 'object') {
      Object.values(item).forEach(freeze);
      Object.freeze(item);
    }
    return item;
  };
  return freeze(index);
}

/** No source-name guesses and no eager artwork reads. In particular an installed
 * pack with a matching name or ID is not automatically the official edition. */
export function classicLibrarySources(
  index,
  { availability, prepare, launch, progress, progressState, card },
) {
  const checked = prepareMissionLibraryIndex(index);
  if (typeof availability !== 'function' || typeof launch !== 'function')
    throw new TypeError('Classic browsing needs host-owned availability and launch adapters.');
  const owners = new Map();
  const originals = new WeakMap();
  const entries = checked.missions.flatMap((entry) =>
    [
      ...(supportsClassicCurrentRules(entry) ? [CLASSIC_RULES_CURRENT] : []),
      CLASSIC_RULES_ORIGINAL,
    ].map((rulesEdition) => {
      const row = Object.freeze({ ...entry, rulesEdition });
      originals.set(row, entry);
      return row;
    }),
  );
  for (const entry of entries) {
    const current = entry.rulesEdition === CLASSIC_RULES_CURRENT;
    const id = JSON.stringify([
      'classic',
      entry.source,
      entry.packId,
      ...(current ? [CLASSIC_RULES_CURRENT] : []),
    ]);
    let owner = owners.get(id);
    if (!owner) {
      const contentLifecycle =
        classifyContent({ family: 'classic', id: entry.packId, source: entry.source }) ===
        'archived'
          ? 'archive'
          : 'current';
      owner = {
        id,
        collection: 'Classic',
        // Once a compatible Current-rules projection exists, the authenticated
        // Original-rules edition remains available through Archive instead of
        // appearing as a duplicate campaign in ordinary player browsing.
        lifecycle: !current && supportsClassicCurrentRules(entry) ? 'archive' : contentLifecycle,
        editionId: current
          ? `${entry.sourceFile.sha256}:${CLASSIC_RULES_CURRENT}`
          : entry.sourceFile.sha256,
        edition: `${entry.edition} · ${current ? 'Current rules' : 'Original rules'}`,
        entries: [],
        describe: (row) => {
          const canonicalLevelKey = canonicalMissionLevelKey(row);
          return {
            id: row.levelId,
            revision: row.levelRevision,
            campaignKey: classicRulesCampaignIdentity(row),
            campaignTitle: row.campaignTitle,
            name: row.name,
            levelIndex: row.levelIndex,
            canonicalLevelKey,
            globalLevelNumber: officialLevelNumber(canonicalLevelKey),
            modes: row.modes,
            tags: row.tags,
            rules: row.rules,
          };
        },
        availability,
        prepare,
        launch,
        progress,
        progressState,
        card,
        presentation: (row) => classicMissionPresentation(originals.get(row), row.rulesEdition),
        details: (row, mode) => classicMissionDetails(originals.get(row), row.rulesEdition, mode),
      };
      owners.set(id, owner);
    }
    if (
      owner.editionId !==
        (current
          ? `${entry.sourceFile.sha256}:${CLASSIC_RULES_CURRENT}`
          : entry.sourceFile.sha256) ||
      owner.edition !== `${entry.edition} · ${current ? 'Current rules' : 'Original rules'}` ||
      (owner.entries.length > 0 &&
        (owner.entries[0].packIdentity?.sha256 !== entry.packIdentity?.sha256 ||
          owner.entries[0].packIdentity?.bytes !== entry.packIdentity?.bytes))
    )
      throw new TypeError('One Classic owner cannot silently combine different source editions.');
    owner.entries.push(entry);
  }
  return [...owners.values()];
}
