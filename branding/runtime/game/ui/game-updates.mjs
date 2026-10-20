// The dedicated app is served in place; the engine's edition manager is not
// an allowed destination here. Do not render a dead update control or its help.
export function attachGameUpdates() { return { button: null, dispose() {} }; }
