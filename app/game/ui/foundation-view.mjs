import { classicView } from './classic-view.mjs';
import { isClassicRuleset, isRunningEnemyRuleset, resolveVersions } from '../core/versions.mjs';

const ownValue = (value, key) => {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !Object.hasOwn(descriptor, 'value')) return undefined;
  return descriptor.value;
};

/** Foundation editions add geometry, not a new effects/artwork contract.
 * Reuse the historical bounded visual projection through an explicit adapter.
 * The real run, runtime identity, buffers, replay and old renderer stay untouched.
 * Descriptors preserve hostile accessors for classicView to reject, not execute. */
export function foundationCompatibleView(run) {
  try {
    if (!run || typeof run !== 'object') return null;
    const descriptor = Object.getOwnPropertyDescriptor(run, 'ruleset');
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) return null;
    let ruleset = descriptor.value;
    if (isRunningEnemyRuleset(ruleset)) {
      const level = ownValue(run, 'level');
      if (resolveVersions({ levelVersion: ownValue(level, 'version') }).ruleset !== ruleset)
        return null;
      const overlay = ownValue(level, 'runningEnemies');
      ruleset = resolveVersions({ levelVersion: ownValue(overlay, 'baseVersion') }).ruleset;
      if (!isClassicRuleset(ruleset)) return null;
    }
    if (
      ![
        'xonix-core.v6',
        'xonix-core.v7',
        'xonix-core.v8',
        'xonix-core.v9',
        'xonix-core.v10',
        'xonix-core.v12',
        'xonix-core.v5',
      ].includes(ruleset)
    )
      return classicView(run);
    const descriptors = Object.getOwnPropertyDescriptors(run);
    descriptors.ruleset = { value: 'xonix-core.v5', enumerable: true };
    return classicView(Object.create(null, descriptors));
  } catch {
    return null;
  }
}
