// Shared source envelope, not a shipped-content target. Draft storage deliberately
// accepts incomplete designs; only the compiler validates gameplay/membership.
export const CONTENT_PROJECT_JSON_LIMITS = Object.freeze({
  maxBytes: 4 * 1024 * 1024,
  maxNodes: 100000,
  maxDepth: 20,
  maxArray: 512,
});
// 242 Solo candidates + 12 Remixes + 12 explicit Team missions must fit together,
// with bounded room for authoring copies. No parser/media budget is increased.
export const CONTENT_PROJECT_ITEM_LIMITS = Object.freeze({
  maps: 512,
  missions: 384,
  campaigns: 64,
  packs: 64,
  assets: 512,
});

// Per-original byte limit, also used to bound descriptive optional-art metadata.
// This does not change the separate 64 MiB core offline-cache budget.
export const CONTENT_ASSET_MAX_BYTES = 4 * 1024 * 1024;

// Reviewed originals are fetched, streamed, hashed, converted into an owned
// browser source and inspected before they can enter play. The public 2:1 Team
// originals can approach the byte ceiling, so this network-and-verification
// budget must cover constrained devices without removing the player's existing
// Cancel/Retry escape. Decoding keeps its separate 15 second bound.
export const CONTENT_ARTWORK_LOAD_TIMEOUT_MS = 60000;
export const CONTENT_ATTEMPT_PREPARATION_TIMEOUT_MS = 90000;
