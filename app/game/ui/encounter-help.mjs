import { boundedJSON } from '../data-json.mjs';
import {
  ENCOUNTER_GUIDE_TOPICS,
  encounterGuideAvailability,
  encounterGuideEntry,
} from '../encounter-guide.mjs';
import { t, localizedText } from '../i18n/index.mjs';

const model = (valid, topics = []) => Object.freeze({ valid, topics: Object.freeze(topics) });

/** Mission-rule guidance, not a report of live actors or attack phases. Retain
 * each board's applicability even when imported boards have different rules. */
export function encounterHelpModel(levels) {
  try {
    if (!Array.isArray(levels) || levels.length > 2) return model(false);
    const boards = boundedJSON(levels),
      topics = [];
    for (const { id } of ENCOUNTER_GUIDE_TOPICS) {
      const players = [];
      for (const [player, level] of boards.entries()) {
        if (level == null) return model(false);
        const availability = encounterGuideAvailability(id, level);
        if (availability.reason === 'invalid') return model(false);
        if (availability.available) players.push(player);
      }
      if (players.length) topics.push(Object.freeze({ id, players: Object.freeze(players) }));
    }
    return model(true, topics);
  } catch {
    return model(false);
  }
}

/** Refresh only when the host enters Help. Locale bindings update text without
 * replacing the active reader or adding an announcement/focus owner. */
export function attachEncounterHelp({ root, getLevels }) {
  let disposed = false;
  const doc = root.ownerDocument;
  const textNode = (tag, text) => {
    const node = doc.createElement(tag);
    localizedText(node, text);
    return node;
  };
  root.hidden = true;
  function refresh() {
    if (disposed) return;
    let current;
    try {
      current = encounterHelpModel(getLevels());
    } catch {
      current = model(false);
    }
    root.replaceChildren();
    root.hidden = current.valid && !current.topics.length;
    if (root.hidden) return;
    root.append(textNode('h2', () => t('interface:encounterHelp.title')));
    if (!current.valid) {
      root.append(textNode('p', () => t('interface:encounterHelp.unavailable')));
      return;
    }
    for (const { id, players } of current.topics) {
      const section = doc.createElement('section');
      section.setAttribute('data-encounter-topic', id);
      section.append(
        textNode(
          'h3',
          () =>
            `${encounterGuideEntry(id).label} · ${players
              .map((player) => t(player ? 'interface:player22' : 'interface:player12'))
              .join(' / ')}`,
        ),
      );
      for (const field of ['spot', 'risk', 'try'])
        section.append(
          textNode('p', () =>
            t(`interface:encounterGuide.${field}`, {
              text: encounterGuideEntry(id)[field],
            }),
          ),
        );
      root.append(section);
    }
  }
  return {
    refresh,
    dispose() {
      disposed = true;
      root.replaceChildren();
      root.hidden = true;
    },
  };
}
