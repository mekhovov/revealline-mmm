import { canonicalJSON, dataIdentity } from '../data-json.mjs';
import registry from './content-registry.mjs';
import { getLocale, t } from './index.mjs';

/** Resolve only an exact shipped record and field. Never mutate content or use
 * a display name alone as identity: edited/imported variants keep authored text.
 * Mutable authoring drafts are rechecked on every read. */
const records = new WeakMap();
const scopes = new Set();
let registryRevision = 0;

/** Explicit host-owned presentation scope. Disposing an edition removes its
 * translations, including cached exact-record lookups. No content is mutated. */
export function installContentTranslations({ entries, resolve = () => null }) {
  const owned = new Map(entries.map(({ record, fields }) => [dataIdentity(record), { fields }]));
  const scope = { owned, resolve };
  scopes.add(scope);
  registryRevision++;
  return () => {
    if (scopes.delete(scope)) registryRevision++;
  };
}

function entryFor(record, identity) {
  for (const scope of [...scopes].reverse()) {
    const entry = scope.owned.get(identity) ?? scope.resolve(record, identity);
    if (entry) return entry;
  }
  return registry[identity] || null;
}
function deeplyFrozen(value, visited = new WeakSet()) {
  if (!value || typeof value !== 'object' || visited.has(value)) return true;
  if (!Object.isFrozen(value)) return false;
  visited.add(value);
  return Object.values(value).every((child) => deeplyFrozen(child, visited));
}
function registeredRecord(record) {
  if (!record || typeof record !== 'object') return null;
  let cached = records.get(record);
  if (!cached?.immutable || cached.registryRevision !== registryRevision) {
    try {
      // Mutable editor records must be checked after edits, including nested
      // geometry changes. Reuse the digest when their exact JSON is unchanged:
      // hashing an entire campaign again for every HUD label is prohibitively slow.
      const json = canonicalJSON(record);
      if (!cached || cached.json !== json || cached.registryRevision !== registryRevision) {
        cached = {
          json,
          entry: entryFor(record, dataIdentity(record)),
          registryRevision,
          immutable: deeplyFrozen(record),
        };
        records.set(record, cached);
      }
    } catch {
      return null;
    }
  }
  return cached.entry;
}

/** Presentation-only identity check for structured labels derived from a
 * shipped record. This never grants installation, artwork or launch authority. */
export function isRegisteredContent(record) {
  return Boolean(registeredRecord(record));
}

export function contentText(record, field) {
  if (record == null) return undefined;
  const original = field.split('.').reduce((value, key) => value?.[key], record);
  if (typeof original !== 'string' || typeof record !== 'object') return original;
  if (getLocale() === 'en') return original;
  const registered = registeredRecord(record)?.fields[field];
  return registered?.source === original
    ? (registered.locales?.[getLocale()] ?? (registered.key ? t(registered.key) : original))
    : original;
}
export function contentList(record, field) {
  return record?.[field]?.map((_, index) => contentText(record, `${field}.${index}`)) || [];
}
