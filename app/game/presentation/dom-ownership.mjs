import { required } from '../data-json.mjs';

const styles = new WeakMap(),
  attributes = new WeakMap();
const equal = (a, b) => a.value === b.value && a.priority === b.priority;
const styleIO = {
  read: (target, key) => ({
    value: target.getPropertyValue(key),
    priority: target.getPropertyPriority?.(key) ?? '',
  }),
  write(target, key, state) {
    if (state.value) target.setProperty(key, state.value, state.priority);
    else target.removeProperty(key);
  },
};
const attributeIO = {
  read: (target, key) => ({ value: target.getAttribute(key), priority: '' }),
  write(target, key, state) {
    if (state.value === null) target.removeAttribute(key);
    else target.setAttribute(key, state.value);
  },
};

/** Shared DOM layers keep the original baseline until the last owner retires.
 * Equal values still have distinct owners. External changes abandon that key's
 * old stack, so later cleanup cannot overwrite a user/screen override.
 */
export function createPresentationDOMOwner() {
  const owned = new Map();
  let live = true;
  function set(registry, target, key, state, io) {
    required(live, 'Presentation DOM owner is released.');
    let table = registry.get(target);
    if (!table) registry.set(target, (table = new Map()));
    const before = io.read(target, key);
    let record = table.get(key);
    if (record && !equal(before, record.layers.at(-1).state)) {
      table.delete(key);
      record = null;
    }
    record ??= { target, key, table, io, base: before, layers: [] };
    const existing = owned.get(record);
    // Updating an older layer must never steal the current layer's DOM values.
    const top = !existing || record.layers.at(-1) === existing;
    if (top && !equal(before, state)) {
      try {
        io.write(target, key, state);
      } catch (error) {
        // Native DOM failures normally leave the field untouched. Also roll
        // back a setter that wrote this exact value before reporting failure.
        if (equal(io.read(target, key), state)) io.write(target, key, before);
        throw error;
      }
    }
    if (existing) existing.state = state;
    else {
      const layer = { state };
      record.layers.push(layer);
      owned.set(record, layer);
      table.set(key, record);
    }
  }
  return Object.freeze({
    style(element, name, value, priority = '') {
      set(styles, element.style, name, { value, priority }, styleIO);
    },
    attribute(element, name, value) {
      set(attributes, element, name, { value, priority: '' }, attributeIO);
    },
    release() {
      if (!live) return;
      live = false;
      for (const [record, layer] of [...owned].reverse()) {
        if (record.table.get(record.key) !== record) continue;
        const index = record.layers.indexOf(layer);
        const wasTop = index === record.layers.length - 1;
        record.layers.splice(index, 1);
        if (wasTop) {
          if (!equal(record.io.read(record.target, record.key), layer.state)) {
            record.table.delete(record.key);
            continue;
          }
          record.io.write(record.target, record.key, record.layers.at(-1)?.state ?? record.base);
        }
        if (!record.layers.length) record.table.delete(record.key);
      }
      owned.clear();
    },
  });
}
