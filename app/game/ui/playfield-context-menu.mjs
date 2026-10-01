/** Keep pointer context menus off a running playfield, not the surrounding UI.
 * A root may be the canvas itself or its mount (Solo creates its canvas later).
 * Browsers that do not dispatch contextmenu keep their native behavior. */
export function attachPlayfieldContextMenu({ roots, active }) {
  const owners = [...new Set(roots.filter(Boolean))].map((root) => {
    let keyboardRequest = false;
    const keydown = (event) => {
      if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey))
        keyboardRequest = true;
    };
    const pointerdown = () => (keyboardRequest = false);
    const contextmenu = (event) => {
      // Older MouseEvents may not identify keyboard origin. Remember its
      // explicit request without consuming any keyboard or pointer input.
      const keyboard = keyboardRequest;
      keyboardRequest = false;
      if (
        keyboard ||
        !event.target?.matches?.('canvas') ||
        !active() ||
        event.shiftKey ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        event.pointerId === -1
      )
        return;
      // Legacy MouseEvents still identify secondary clicks. Unidentified
      // virtual activations must retain their native menu.
      if (
        event.button === 2 ||
        (['touch', 'pen'].includes(event.pointerType) && event.pointerId > 0)
      )
        event.preventDefault();
    };
    const listeners = { keydown, pointerdown, contextmenu };
    for (const [type, handler] of Object.entries(listeners)) root.addEventListener(type, handler);
    return () => {
      for (const [type, handler] of Object.entries(listeners))
        root.removeEventListener(type, handler);
    };
  });
  return () => {
    for (const dispose of owners) dispose();
  };
}
