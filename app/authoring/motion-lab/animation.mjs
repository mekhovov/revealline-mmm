// Cosmetic recipes and alias-aware phase sampling. No movement, score or collision inputs are mutated.
const TAU = Math.PI * 2;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const color = value => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
const finiteRange = (value, low, high) => Number.isFinite(value) && value >= low && value <= high;

export function rotorAnchors(character) {
  return (character.rotors || []).map((anchor, index) => Array.isArray(anchor)
    ? {x: anchor[0], y: anchor[1], radiusScale: anchor[2] / 0.16, direction: index % 2 ? -1 : 1, phaseDegrees: index * 23}
    : {radiusScale: 1, direction: 1, phaseDegrees: 0, ...anchor});
}

export function createAnimationState() { return {time: 0, phases: {}, rates: {}}; }

export function bladeAngles(bladeCount, phase = 0) {
  if (![2, 3, 4].includes(bladeCount)) throw new Error("Blade count must be 2, 3 or 4");
  return Array.from({length: bladeCount}, (_, index) => phase + index * TAU / bladeCount);
}

export function aliasSafePhase(previous, requestedRps, elapsed, bladeCount, maximumVisualRps = 2.6) {
  if (![2, 3, 4].includes(bladeCount)) throw new Error("Blade count must be 2, 3 or 4");
  const dt = Number.isFinite(elapsed) ? clamp(elapsed, 0, 0.25) : 0;
  const requested = Number.isFinite(requestedRps) ? Math.max(0, requestedRps) : 0;
  const desiredStep = Math.min(requested, maximumVisualRps) * TAU * dt;
  // Less than a quarter of the repeated blade pattern per displayed frame prevents apparent reversal.
  const phaseStep = Math.min(desiredStep, TAU / bladeCount * 0.22);
  return {phase: (previous + phaseStep) % TAU, phaseStep,
    visualRps: dt > 0 ? phaseStep / TAU / dt : 0, requestedRps: requested,
    limited: desiredStep < requested * TAU * dt || phaseStep < desiredStep};
}

export function advanceAnimation(previous, recipe, travel, elapsed, options = {}) {
  if (options.paused || options.reducedMotion) return {...previous, phases: {...previous.phases}, rates: {...previous.rates}};
  const dt = Number.isFinite(elapsed) ? clamp(elapsed, 0, 0.25) : 0;
  const timeScale = options.inspectionSlow ? 0.32 : 1;
  const next = {time: previous.time + dt * timeScale, phases: {...previous.phases}, rates: {...previous.rates}};
  const speedRatio = clamp(travel.visualSpeed / Math.max(0.01, travel.cruiseSpeed), 0, 4);
  for (const component of recipe.components) {
    if (component.type === "wings") {
      // Integrate frequency instead of multiplying absolute time: speed edits cannot rephase a flap.
      next.phases[component.id] = ((previous.phases[component.id] || 0) + dt*timeScale*TAU*(component.frequencyHz+component.speedFrequencyGain*speedRatio)) % TAU;
      continue;
    }
    if (component.type !== "rotors") continue;
    const rawRps = component.idleRps + component.travelRps * speedRatio;
    const requested = options.inspectionSlow ? Math.min(rawRps, 0.65) : rawRps;
    const sampled = aliasSafePhase(previous.phases[component.id] || 0, requested, dt, component.bladeCount, component.maxVisualRps);
    next.phases[component.id] = sampled.phase;
    next.rates[component.id] = {...sampled, rawRps};
  }
  return next;
}

export function componentPose(component, animation, speedRatio, reducedMotion = false) {
  const time = reducedMotion ? 0 : animation.time;
  const speed = clamp(speedRatio, 0, 4);
  if (component.type === "wings") {
    const flap = reducedMotion ? 0 : Math.sin(animation.phases?.[component.id] || 0);
    return {flap, span: component.span * (1 - Math.abs(flap) * component.foldFraction), angle: flap * component.amplitudeDegrees * Math.PI / 180};
  }
  if (component.type === "thruster") {
    const flicker = reducedMotion ? 1 : 0.86 + 0.14 * Math.sin(time * TAU * component.flickerHz);
    return {length: component.length * (0.25 + Math.min(speed, 2) * component.speedGain) * flicker};
  }
  if (component.type === "pulse") {
    const wave = reducedMotion ? 0 : (1 + Math.sin(time * TAU * component.frequencyHz)) / 2;
    return {radius: component.radius + component.amplitude * wave, opacity: component.opacity * (0.6 + wave * 0.4)};
  }
  if (component.type === "blink") {
    const phase = (time * component.frequencyHz) % 1;
    return {opacity: reducedMotion ? 0.8 : phase < component.dutyCycle ? 1 : 0.35};
  }
  return {};
}

export function validateAnimationRecipes(presets) {
  const fail = message => {throw new Error(`Animation preset error: ${message}`);};
  if (!presets.animationRecipes || typeof presets.animationRecipes !== "object") fail("recipes are required");
  for (const [id, recipe] of Object.entries(presets.animationRecipes)) {
    if (!Array.isArray(recipe.components) || recipe.components.length > 8) fail(`${id}: components must be an array of at most eight`);
    const ids = new Set();
    for (const component of recipe.components) {
      if (typeof component.id !== "string" || !component.id || ids.has(component.id)) fail(`${id}: unique component IDs required`);
      ids.add(component.id);
      if (!["rotors", "wings", "thruster", "pulse", "blink"].includes(component.type)) fail(`${id}: unsupported component`);
      if (component.type === "rotors") {
        if (![2, 3, 4].includes(component.bladeCount)) fail(`${id}: bladeCount must be 2, 3 or 4`);
        if (!["swept", "tapered", "paddle"].includes(component.bladeShape)) fail(`${id}: unknown blade shape`);
        for (const [key, low, high] of [["radius", 0.04, 0.35], ["bladeWidth", 0.1, 0.5], ["idleRps", 0, 15], ["travelRps", 0, 60], ["maxVisualRps", 0.1, 6], ["blurOpacity", 0, 0.4], ["phaseDegrees", -360, 360]]) {
          if (!finiteRange(component[key], low, high)) fail(`${id}: invalid ${key}`);
        }
        if (![1, -1].includes(component.direction)) fail(`${id}: rotor direction must be 1 or -1`);
        for (const key of ["fillColor", "tipColor", "hubColor"]) if (!color(component[key])) fail(`${id}: invalid ${key}`);
      } else {
        if (!color(component.color)) fail(`${id}: invalid color`);
        if (component.type === "wings") {
          if (!color(component.tipColor)) fail(`${id}: invalid wing tip color`);
          for (const [key, low, high] of [["span", 0.1, 0.8], ["chord", 0.05, 0.35], ["frequencyHz", 0.1, 5], ["speedFrequencyGain", 0, 2], ["amplitudeDegrees", 0, 40], ["foldFraction", 0, 0.7]]) if (!finiteRange(component[key], low, high)) fail(`${id}: invalid wing ${key}`);
        }
        if (component.type === "thruster") {
          if (!color(component.innerColor)) fail(`${id}: invalid thruster core color`);
          for (const [key, low, high] of [["length", 0.05, 0.8], ["width", 0.03, 0.4], ["speedGain", 0, 2], ["flickerHz", 0.1, 12]]) if (!finiteRange(component[key], low, high)) fail(`${id}: invalid thruster ${key}`);
        }
        if (component.type === "pulse") for (const [key, low, high] of [["radius", 0.05, 0.8], ["amplitude", 0, 0.2], ["frequencyHz", 0.1, 2], ["opacity", 0, 0.5]]) if (!finiteRange(component[key], low, high)) fail(`${id}: invalid pulse ${key}`);
        if (component.type === "blink") for (const [key, low, high] of [["frequencyHz", 0.1, 2], ["dutyCycle", 0.05, 0.8], ["size", 0.02, 0.15]]) if (!finiteRange(component[key], low, high)) fail(`${id}: invalid blink ${key}`);
        if (!Array.isArray(component.anchors) || component.anchors.length > 8 || component.anchors.some(anchor => !Array.isArray(anchor) || anchor.length < 2 || !anchor.every(value => finiteRange(value, -1, 1)))) fail(`${id}: invalid effect anchors`);
      }
    }
  }
  for (const [id, character] of Object.entries(presets.characters)) {
    if (!Object.hasOwn(presets.animationRecipes, character.animationRecipe)) fail(`${id}: unknown recipe`);
    const anchors = rotorAnchors(character);
    if (anchors.length > 8 || anchors.some(anchor => !finiteRange(anchor.x, -0.6, 0.6) || !finiteRange(anchor.y, -0.6, 0.6) || !finiteRange(anchor.radiusScale, 0.1, 2) || ![1, -1].includes(anchor.direction) || !finiteRange(anchor.phaseDegrees, -360, 360))) fail(`${id}: invalid rotor rig`);
  }
  return presets;
}
