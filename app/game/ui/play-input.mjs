/** Menus and form fields own their keys; play buttons keep normal activation
 * while direction keys remain usable immediately after clicking Start. */
export function blocksPlayInput(event, { blocked = false, hidden = false } = {}) {
  if (event.defaultPrevented || blocked || hidden) return true;
  const tag = event.target?.tagName;
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(tag)) return true;
  return /^(BUTTON|A)$/.test(tag) && [' ', 'Enter'].includes(event.key);
}
