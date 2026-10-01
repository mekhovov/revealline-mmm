import { canonicalJSON, required } from '../data-json.mjs';
import { ASSET_SLOTS } from './catalog.mjs';
import { createPresentationHost, ACTOR_PRESENTATION_SLOTS } from './host.mjs';
import { snapshotVisualThemeContext } from './visual-theme-catalogue.mjs';
import {
  ACTOR_APPEARANCE_PIN_FORMAT,
  AUTHORED_ACTOR_APPEARANCE_PIN_FORMAT,
  ACTOR_APPEARANCE_RENDERER_POLICY,
  snapshotActorAppearancePin,
  validateActorAppearancePinForContent,
} from './actor-appearance-pin.mjs';
import { resolveActorStyle } from './actor-style-policy.mjs';
import { TEAM_PILOT_SLOTS, TEAM_ENEMY_SLOTS, TEAM_CORE_SLOTS } from './team-runtime-slots.mjs';
import { prepareTeamPilots } from '../couch/coop-pilot-slots.mjs';
import { prepareTeamEnemies } from '../couch/coop-enemy-slots.mjs';
import { prepareTeamCores } from '../couch/coop-core-presentation.mjs';

const registry = new Map(ASSET_SLOTS.map((slot) => [slot.id, slot]));
// Code-owned actor-only approval, not broader full-theme compatibility. Keep
// immutable entries when later releases are added; a save cannot register one.
export const ACTOR_APPEARANCE_RELEASES = Object.freeze([
  Object.freeze({
    scope: 'actors',
    rendererPolicy: ACTOR_APPEARANCE_RENDERER_POLICY,
    modes: Object.freeze(['solo', 'versus', 'team']),
    presentation: Object.freeze({
      source: Object.freeze({ id: 'field-kit', revision: 62 }),
      theme: Object.freeze({ id: 'fpv', revision: 62 }),
      collection: null,
      sha256: 'b4a7285520550e4cd04c7b9e80b4c6468c0a914faac77c05fa7f86a72c8a3c8f',
    }),
  }),
]);
const soloSlots = Object.freeze(ACTOR_PRESENTATION_SLOTS.filter((id) => !id.startsWith('team.')));
const teamSlots = new Set([...TEAM_PILOT_SLOTS, ...TEAM_ENEMY_SLOTS, ...TEAM_CORE_SLOTS]);
for (const id of teamSlots)
  for (const dependency of registry.get(id).dependencies) teamSlots.add(dependency);
// Existing Team actor renderer uses these shared bodies for live non-state roles.
for (const id of ['enemy.claimed-rover', 'enemy.relay-sentinel']) teamSlots.add(id);
export const ACTOR_APPEARANCE_REQUIRED_SLOTS = Object.freeze({
  solo: soloSlots,
  versus: soloSlots,
  team: Object.freeze([...teamSlots]),
});
const abort = (signal) => {
  if (signal?.aborted) throw new DOMException('Actor preparation cancelled.', 'AbortError');
};
const pinFor = (style, content, presentation) =>
  snapshotActorAppearancePin({
    format: ACTOR_APPEARANCE_PIN_FORMAT,
    style,
    rendererPolicy: ACTOR_APPEARANCE_RENDERER_POLICY,
    content,
    presentation,
  });

function campaignLease(content, authoredPresentationSha256) {
  const pin =
    authoredPresentationSha256 === undefined
      ? pinFor('campaign', content, null)
      : snapshotActorAppearancePin({
          format: AUTHORED_ACTOR_APPEARANCE_PIN_FORMAT,
          style: 'campaign',
          rendererPolicy: ACTOR_APPEARANCE_RENDERER_POLICY,
          content,
          presentation: null,
          authoredPresentationSha256,
        });
  let closed = false;
  return Object.freeze({
    snapshot: null,
    pin() {
      required(!closed, 'Actor lease is released.');
      return pin;
    },
    release() {
      closed = true;
    },
  });
}

function scopedContent(source, scope) {
  const content = snapshotVisualThemeContext(source);
  required(
    (['builtin', 'trusted-pack'].includes(scope) && content.owner.kind === 'campaign') ||
      (scope === 'journey' && content.owner.kind === 'journey') ||
      (scope === 'team-pack' && content.owner.kind === 'team-pack'),
    'Use the accepted code-owned actor content scope; Custom requires separate opt-in.',
  );
  return content;
}

function verifyActors(snapshot, mode) {
  for (const id of ACTOR_APPEARANCE_REQUIRED_SLOTS[mode]) {
    const asset = snapshot.resolved.assets[id],
      definition = registry.get(id);
    required(asset, `Required actor slot is missing: ${id}.`);
    if (id.endsWith('.rotors') || (id.startsWith('team.') && asset.kind === 'recipe')) {
      required(
        asset.kind === 'recipe' && definition.recipes.includes(asset.recipe?.id),
        `Actor slot has no registered recipe: ${id}.`,
      );
      continue;
    }
    const frame = snapshot.image(id);
    required(
      asset.kind === 'image' && frame?.image && frame.geometry,
      `Required actor image is not decoded: ${id}.`,
    );
  }
  if (mode === 'team') {
    prepareTeamPilots(snapshot);
    prepareTeamEnemies(snapshot);
    prepareTeamCores(snapshot);
  }
}

/** One actor dependency, not a ready attempt. scope is a trusted host assertion
 * derived from its accepted entry/pack registry, NEVER from an uploaded pin,
 * campaign label or user preference. It cannot itself authenticate installed
 * content. Custom opt-in is deliberately unsupported. This reuses the
 * full loader's byte/hash/decode/resource checks with its fixed actors profile.
 * It exposes no DOM, palette, font, background, picture or audio authority.
 */
export async function prepareActorAppearanceLease(
  {
    style = 'fpv',
    content: sourceContent,
    scope,
    presentation = ACTOR_APPEARANCE_RELEASES[0].presentation,
    authoredPresentationSha256,
  },
  {
    createHost = createPresentationHost,
    baseURL,
    signal,
    onStatus = () => {},
    fetch: request,
    currentManifestSha256 = null,
  } = {},
) {
  abort(signal);
  const content = scopedContent(sourceContent, scope);
  resolveActorStyle(style);
  if (style === 'campaign') return campaignLease(content, authoredPresentationSha256);
  const declaration = pinFor('fpv', content, presentation),
    approved = ACTOR_APPEARANCE_RELEASES.find(
      (release) =>
        release.rendererPolicy === declaration.rendererPolicy &&
        release.modes.includes(content.mode) &&
        canonicalJSON(release.presentation) === canonicalJSON(declaration.presentation),
    );
  required(approved, 'This exact actor release is not approved; no newer release will substitute.');
  required(
    currentManifestSha256 === null ||
      (typeof currentManifestSha256 === 'string' && /^[a-f0-9]{64}$/.test(currentManifestSha256)),
    'Use the exact current presentation manifest hash.',
  );
  const report = (value) => {
    if (signal?.aborted) return;
    try {
      onStatus(value);
    } catch {
      /* Observers do not own staged resources. */
    }
  };
  let host,
    closed = false;
  const acquire = async (retainedManifestSha256) => {
    const staged = createHost({
      profile: 'actors',
      baseURL,
      fetch: request,
      document: null,
      retainedManifestSha256,
    });
    // Do not close a mistakenly supplied live owner.
    required(staged.current() === null, 'Stage actors in a fresh presentation host.');
    host = staged;
    return host.load({
      signal,
      expectedManifestSha256: declaration.presentation.sha256,
      onStatus: (status) => {
        if (status.status === 'preparing') report(status);
      },
    });
  };
  try {
    let accepted;
    if (currentManifestSha256 !== null)
      accepted = await acquire(
        currentManifestSha256 === declaration.presentation.sha256
          ? null
          : declaration.presentation.sha256,
      );
    else {
      try {
        accepted = await acquire(null);
      } catch (error) {
        abort(signal);
        if (error.message !== 'Presentation manifest differs from its pinned release.') throw error;
        host.close();
        accepted = await acquire(declaration.presentation.sha256);
      }
    }
    abort(signal);
    required(
      canonicalJSON({
        source: accepted.source,
        theme: { id: accepted.resolved.theme.id, revision: accepted.resolved.theme.revision },
        collection: accepted.resolved.collection,
        sha256: accepted.manifestSha256,
      }) === canonicalJSON(declaration.presentation),
      'Loaded actors differ from the approved exact source.',
    );
    verifyActors(accepted, content.mode);
    const all = new Set(ACTOR_PRESENTATION_SLOTS),
      assets = Object.freeze(
        Object.fromEntries(Object.entries(accepted.resolved.assets).filter(([id]) => all.has(id))),
      ),
      bindings = Object.freeze(
        Object.fromEntries(
          Object.entries(accepted.resolved.bindings).filter(([id]) => all.has(id)),
        ),
      );
    const check = () => required(!closed, 'Actor lease is released.');
    const snapshot = Object.freeze({
      source: accepted.source,
      manifestSha256: accepted.manifestSha256,
      resolved: Object.freeze({
        theme: accepted.resolved.theme,
        collection: accepted.resolved.collection,
        assets,
        bindings,
      }),
      image(id) {
        check();
        return all.has(id) ? accepted.image(id) : null;
      },
    });
    const pin = declaration;
    report({
      status: 'ready',
      stage: 'ready',
      progress: null,
      message: 'The exact actor appearance is ready.',
    });
    abort(signal);
    return Object.freeze({
      snapshot,
      pin() {
        check();
        return pin;
      },
      release() {
        if (closed) return;
        closed = true;
        host.close();
      },
    });
  } catch (error) {
    host?.close();
    if (error.name !== 'AbortError')
      report({
        status: 'error',
        stage: 'error',
        progress: null,
        message: `Actor preparation failed: ${error.message}`,
      });
    throw error;
  }
}

/** Retain exact accepted content and immutable registered actor release. The pin
 * has no approval authority. Same names or a newer source never substitute.
 */
export async function prepareRetainedActorAppearanceLease(
  { pin: source, content, scope, authoredPresentationSha256 },
  options = {},
) {
  abort(options.signal);
  const pin = validateActorAppearancePinForContent(source, content);
  required(
    pin.authoredPresentationSha256 === authoredPresentationSha256,
    'This flight needs its exact earlier artwork and actor recipes. Open the matching edition release; the original save is preserved.',
  );
  return prepareActorAppearanceLease(
    {
      style: pin.style,
      content: pin.content,
      scope,
      presentation: pin.presentation,
      authoredPresentationSha256,
    },
    options,
  );
}
