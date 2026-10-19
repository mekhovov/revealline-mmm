import assert from 'node:assert/strict';

/** The owned native pack is the editable source. This projection deliberately
 * carries simulation identities and recipes without importing creator UI or
 * the mixed upstream theme producers that originally assembled the pack. */
export function compileCollection(pack, admission) {
  assert.ok(['xonix-pack.v2', 'xonix-pack.v5', 'xonix-pack.v6'].includes(pack.format));
  assert.equal(pack.engine, pack.format.replace('pack', 'core'));
  assert.equal(pack.id, admission.id);
  assert.deepEqual(
    pack.campaigns.flatMap((c) => c.levels.map((l) => l.id)),
    admission.levelIds,
  );
  assert.ok(pack.classRecipes.length > 0);
  return {
    format: 'branded-native-collection.v1',
    id: pack.id,
    campaigns: pack.campaigns.map(({ id, revision, title, levels }) => ({
      id,
      revision,
      title,
      levels: structuredClone(levels),
    })),
    classRecipes: structuredClone(pack.classRecipes),
  };
}
