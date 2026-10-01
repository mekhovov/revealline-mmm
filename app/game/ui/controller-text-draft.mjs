const previous = (text, position) => position - (text.codePointAt(position - 2) > 0xffff ? 2 : 1);
const following = (text, position) => position + (text.codePointAt(position) > 0xffff ? 2 : 1);

/** UTF-16 selections match native textarea APIs; edits never split surrogate pairs. */
export function createTextDraft(value, { start = value.length, end = start, maxLength = -1 } = {}) {
  let text = String(value),
    anchor = start,
    caret = end,
    selecting = false;
  const undo = [],
    redo = [];
  const clamp = (position) => {
    const bounded = Math.max(0, Math.min(text.length, position));
    const code = text.charCodeAt(bounded);
    return code >= 0xdc00 && code <= 0xdfff ? Math.max(0, bounded - 1) : bounded;
  };
  const snapshot = () => ({
    value: text,
    start: Math.min(anchor, caret),
    end: Math.max(anchor, caret),
    direction: caret < anchor ? 'backward' : 'forward',
    selecting,
  });
  const remember = (state = { text, anchor, caret }) => {
    undo.push(state);
    if (undo.length > 100) undo.shift();
    redo.length = 0;
  };
  function replace(insert, before) {
    const low = Math.min(anchor, caret),
      high = Math.max(anchor, caret);
    if (maxLength >= 0 && text.length - high + low + insert.length > maxLength) return false;
    remember(before);
    text = text.slice(0, low) + insert + text.slice(high);
    anchor = caret = low + insert.length;
    return true;
  }
  function move(action) {
    const low = Math.min(anchor, caret),
      high = Math.max(anchor, caret);
    let next = caret;
    if (action === 'left') next = !selecting && low !== high ? low : previous(text, caret);
    if (action === 'right') next = !selecting && low !== high ? high : following(text, caret);
    const lineStart = text.slice(0, caret).lastIndexOf('\n') + 1,
      lineEnd = text.indexOf('\n', caret),
      column = caret - lineStart;
    if (action === 'home') next = lineStart;
    if (action === 'end') next = lineEnd < 0 ? text.length : lineEnd;
    if (action === 'up' && lineStart > 0) {
      const above = text.slice(0, lineStart - 1).lastIndexOf('\n') + 1;
      next = Math.min(lineStart - 1, above + column);
    }
    if (action === 'down' && lineEnd >= 0) {
      const belowEnd = text.indexOf('\n', lineEnd + 1);
      next = Math.min(belowEnd < 0 ? text.length : belowEnd, lineEnd + 1 + column);
    }
    caret = clamp(next);
    if (!selecting) anchor = caret;
  }
  function action(kind, insert = '') {
    if (kind === 'insert') return replace(insert);
    if (kind === 'select') {
      selecting = !selecting;
      return true;
    }
    if (kind === 'all') {
      anchor = 0;
      caret = text.length;
      return true;
    }
    if (kind === 'backspace' || kind === 'delete') {
      const before = { text, anchor, caret };
      if (anchor === caret) {
        if (kind === 'backspace') anchor = clamp(previous(text, caret));
        else caret = clamp(following(text, caret));
      }
      return anchor === caret ? true : replace('', before);
    }
    if (kind === 'undo' || kind === 'redo') {
      const source = kind === 'undo' ? undo : redo,
        target = kind === 'undo' ? redo : undo;
      if (!source.length) return true;
      target.push({ text, anchor, caret });
      ({ text, anchor, caret } = source.pop());
      return true;
    }
    move(kind);
    return true;
  }
  return {
    snapshot,
    action,
    adopt(value, start, end, direction = 'forward') {
      if (String(value) !== text) {
        remember();
        text = String(value);
      }
      anchor = clamp(direction === 'backward' ? end : start);
      caret = clamp(direction === 'backward' ? start : end);
    },
  };
}
