import { classicView } from './classic-view.mjs';

/** Foundation editions add geometry, not a new effects/artwork contract.
 * Reuse the historical bounded visual projection through an explicit adapter.
 * The real run, runtime identity, buffers, replay and old renderer stay untouched.
 * Descriptors preserve hostile accessors for classicView to reject, not execute. */
export function foundationCompatibleView(run) {
  try {
    if (!run || typeof run !== 'object') return null;
    const descriptor = Object.getOwnPropertyDescriptor(run, 'ruleset');
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) return null;
    if (
      !['xonix-core.v6', 'xonix-core.v7', 'xonix-core.v8', 'xonix-core.v9'].includes(
        descriptor.value,
      )
    )
      return classicView(run);
    const descriptors = Object.getOwnPropertyDescriptors(run);
    descriptors.ruleset = { value: 'xonix-core.v5', enumerable: true };
    return classicView(Object.create(null, descriptors));
  } catch {
    return null;
  }
}
