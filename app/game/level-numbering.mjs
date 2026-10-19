// Locally owned mission numbers retain the original display identities.
// Shared registry retirement must never renumber this independent app.
const numbers = new Map([
  ['["mission","equipment-workshop","equipment-workshop","workshop-03"]', 139],
  [
    '["mission","original-spend-network","original-spend-shared-routes","original-spend-shared-harbor"]',
    162,
  ],
  [
    '["mission","original-spend-network","original-spend-shared-routes","original-spend-city-wins"]',
    163,
  ],
  [
    '["mission","original-spend-network","original-spend-shared-routes","original-spend-market-workshop"]',
    164,
  ],
  ['["mission","route-worlds-coupa","route-worlds-coupa","route-worlds-coupa-foundry"]', 177],
  ['["mission","route-worlds-coupa","route-worlds-coupa","route-worlds-coupa-depot"]', 178],
  ['["mission","route-worlds-coupa","route-worlds-coupa","route-worlds-coupa-switchback"]', 179],
  [
    '["mission","sentinel-circuit-coupa","sentinel-circuit-coupa","sentinel-circuit-coupa-listening-court"]',
    189,
  ],
  [
    '["mission","sentinel-circuit-coupa","sentinel-circuit-coupa","sentinel-circuit-coupa-switchyard-gates"]',
    190,
  ],
  [
    '["mission","sentinel-circuit-coupa","sentinel-circuit-coupa","sentinel-circuit-coupa-open-circuit"]',
    191,
  ],
  ['["mission","fracture-lines-coupa","fracture-lines-coupa","fracture-lines-split-ring"]', 201],
  ['["mission","fracture-lines-coupa","fracture-lines-coupa","fracture-lines-fault-fan"]', 202],
  [
    '["mission","fracture-lines-coupa","fracture-lines-coupa","fracture-lines-frayed-causeway"]',
    203,
  ],
  ['["mission","countercurrent-coupa","countercurrent-coupa","countercurrent-offset-docks"]', 213],
  ['["mission","countercurrent-coupa","countercurrent-coupa","countercurrent-sandbar-braid"]', 214],
  [
    '["mission","countercurrent-coupa","countercurrent-coupa","countercurrent-crossing-watch"]',
    215,
  ],
  ['["company","coupa-spend-in-motion","coupa-spend-in-motion-01"]', 216],
  ['["company","coupa-spend-in-motion","coupa-spend-in-motion-02"]', 217],
  ['["company","coupa-spend-in-motion","coupa-spend-in-motion-03"]', 218],
  ['["company","coupa-spend-in-motion","coupa-spend-in-motion-04"]', 219],
  ['["company","coupa-spend-in-motion","coupa-spend-in-motion-05"]', 220],
  ['["company","coupa-spend-in-motion","coupa-spend-in-motion-06"]', 221],
  ['["company","coupa-inside-village","coupa-inside-village-01"]', 222],
  ['["company","coupa-inside-village","coupa-inside-village-02"]', 223],
  ['["company","coupa-inside-village","coupa-inside-village-03"]', 224],
  ['["company","coupa-inside-village","coupa-inside-village-04"]', 225],
  ['["company","coupa-inside-village","coupa-inside-village-05"]', 226],
  ['["company","coupa-inside-village","coupa-inside-village-06"]', 227],
  ['["company","coupa-source-to-pay","coupa-source-to-pay-01"]', 228],
  ['["company","coupa-source-to-pay","coupa-source-to-pay-02"]', 229],
  ['["company","coupa-source-to-pay","coupa-source-to-pay-03"]', 230],
  ['["company","coupa-source-to-pay","coupa-source-to-pay-04"]', 231],
  ['["company","coupa-source-to-pay","coupa-source-to-pay-05"]', 232],
  ['["company","coupa-source-to-pay","coupa-source-to-pay-06"]', 233],
  ['["company","coupa-product-operations","coupa-product-operations-01"]', 234],
  ['["company","coupa-product-operations","coupa-product-operations-02"]', 235],
  ['["company","coupa-product-operations","coupa-product-operations-03"]', 236],
  ['["company","coupa-product-operations","coupa-product-operations-04"]', 237],
  ['["company","coupa-product-operations","coupa-product-operations-05"]', 238],
  ['["company","coupa-product-operations","coupa-product-operations-06"]', 239],
  ['["company","coupa-developer-integration","coupa-developer-integration-01"]', 240],
  ['["company","coupa-developer-integration","coupa-developer-integration-02"]', 241],
  ['["company","coupa-developer-integration","coupa-developer-integration-03"]', 242],
  ['["company","coupa-developer-integration","coupa-developer-integration-04"]', 243],
  ['["company","coupa-developer-integration","coupa-developer-integration-05"]', 244],
  ['["company","coupa-developer-integration","coupa-developer-integration-06"]', 245],
  ['["mission","neon-mosaic-pack","neon-mosaic","neon-coupa-pack"]', 294],
]);
export const OFFICIAL_LEVEL_COUNT = numbers.size;
export function canonicalMissionLevelKey({ packId = null, campaignId, levelId }) {
  if (![campaignId, levelId].every((value) => typeof value === 'string' && value.length > 0))
    return null;
  return JSON.stringify(['mission', packId ?? '_base', campaignId, levelId]);
}

export function canonicalCompanyLevelKey({ campaignId, missionId }) {
  if (![campaignId, missionId].every((value) => typeof value === 'string' && value.length > 0))
    return null;
  return JSON.stringify(['company', campaignId, missionId]);
}

export function officialLevelNumber(canonicalLevelKey) {
  return typeof canonicalLevelKey === 'string' ? (numbers.get(canonicalLevelKey) ?? null) : null;
}
