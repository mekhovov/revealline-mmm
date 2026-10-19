import { parse } from 'acorn';
import LZString from 'lz-string';

function omitImports(source, names) {
  const tree = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  const imports = tree.body.filter(node => node.type === 'ImportDeclaration' && names.includes(node.source.value));
  if (imports.length !== names.length) throw new Error('Upstream Snake presentation imports changed.');
  for (const node of imports.reverse()) source = source.slice(0, node.start) + source.slice(node.end);
  return source;
}

/** Executed before dependency discovery: disallowed art cannot enter the bundle. */
export function projectBrandSource(name, bytes) {
  if (name.endsWith('.css')) return Buffer.from(bytes.toString('utf8').replace(/url\(['"]\.\.?\/presentation\/compiled\/assets\/[a-f0-9]+\.png['"]\)/g, 'none'));
  if (name === 'game/i18n/catalogs.mjs') {
    const source=bytes.toString('utf8'), pattern=/JSON\.parse\(decode\(("[^"]+")\)\)/g;
    const matches=[...source.matchAll(pattern)];
    if(matches.length!==1)throw new Error('Translation catalog encoding changed.');
    const sourceCatalog=JSON.parse(LZString.decompressFromBase64(JSON.parse(matches[0][1])));
    const clean=value=>typeof value==='string'?value.replaceAll('FPV / LINE','Coupa Village').replaceAll('Display & Language','Display').replaceAll('FPV Field Kit','Coupa').replace(/\bFPV\b/g,'Coupa'):Array.isArray(value)?value.map(clean):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,value])=>[key,clean(value)])):value;
    return Buffer.from(source.replace(matches[0][0],`JSON.parse(decode(${JSON.stringify(LZString.compressToBase64(JSON.stringify(clean(sourceCatalog))))}))`));
  }
  if (!['game/snake/classic-view.mjs', 'game/snake/classic-target-art.mjs', 'game/snake/classic-flight-art.mjs', 'game/ui/actor-recipes.mjs', 'game/ui/actor-presentation.mjs', 'game/presentation/catalog.mjs', 'game/presentation/host.mjs', 'game/journey/reactions.mjs', 'game/ui/render.mjs', 'game/couch/coop-view.mjs', 'game/couch/coop-actor-presentation.mjs', 'game/ui/global-settings-tools.mjs', 'game/ui/global-settings-view.mjs', 'game/ui/mode-settings-view.mjs', 'game/ui/menu-audio.mjs'].includes(name)) return bytes;
  let source = bytes.toString('utf8');
  if (name === 'game/ui/menu-audio.mjs') {
    const boundary='function attachPreference(sound, doc, prefix, property, key, enableCopy, volumeCopy, options) {';
    if(!source.includes(boundary))throw new Error('Audio settings boundary changed.');
    source=source.replace(boundary,boundary+"\n  if (prefix === 'radio') return () => {};");
  }
  if (name === 'game/ui/global-settings-tools.mjs') {
    const boundary = '  if (coreURL)\n    for (const [key, category, title, route, icon]';
    if (!source.includes(boundary)) throw new Error('Settings navigation boundary changed.');
    source = source.replace(boundary, '  if (false)\n    for (const [key, category, title, route, icon]');
  }
  if (name === 'game/ui/global-settings-view.mjs') {
    source = source.replace(/    \{ key: '(?:language|appearance|offlineTools|storageRetention|creatorTools|controllerTools|about)'[^\n]+\n/g, '');
  }
  if (name === 'game/ui/mode-settings-view.mjs') {
    source = source.replace("display: 'Display & Language'", "display: 'Display'");
  }
  if (name === 'game/snake/classic-view.mjs') {
    source = omitImports(source, [
      './classic-world-reactions.mjs', './classic-worlds.mjs',
      '../presentation/industrial-arcade-builtins.mjs', '../hunt/destruction.mjs',
      '../hunt/preferences.mjs', './classic-scenes.mjs',
    ]);
    source = source.replace("export { resolveClassicBoardScene, classicSceneBackdrop } from './classic-scenes.mjs';", '');
    source = `import { COUPA_PALETTE } from './coupa-art.mjs';\n` + source;
    // Keep all geometry, objectives, signal hazards and readability cues. Only
    // decorative providers are replaced; no appearance input can opt out.
    source += `\nfunction runtimeActorArtRevision(){ return null; }
function isClassicWorldStyle(){ return false; }
function resolveClassicWorld(){ return { scene: null }; }
const INDUSTRIAL_BUILTIN_SPRITES = { 'terrain.wall': [] };
function observeClassicWorldReactions(){ return null; }
function drawClassicWorldReactions(){}
function drawClassicWorldEquipment(){}
function drawHuntRemains(){}
`;
    const boundary = '  const { width, height, walls, wrap } = run.level,';
    if (source.split(boundary).length !== 2) throw new Error('Snake render policy boundary changed.');
    source = source.replace(boundary, `  boardStyle = 'coupa'; cast = 'coupa'; artRevision = null;
  brutal = false; blood = false; showRemains = false; effects = null;
  presentation = { palette: COUPA_PALETTE }; style = 'segmented';
${boundary}`);
  }
  if (name === 'game/snake/classic-target-art.mjs') {
    const end = source.indexOf('/** Equipment is large enough');
    if (end < 0) throw new Error('Snake target presentation boundary changed.');
    source = source.slice(0, end);
    source = omitImports(source, ['../hunt/actor-art.mjs', '../presentation/industrial-machinery.mjs', './classic-target-identity.mjs']);
    source += `\nimport { drawConnectionToken } from './coupa-art.mjs';
export function drawClassicTarget(ctx, x, y, size, pose=0, options={}) {
  drawConnectionToken(ctx, x, y, size, options, classicTargetPose(options, pose));
}\n`;
  }
  if (name === 'game/snake/classic-flight-art.mjs') {
    const at = source.indexOf('function direction(');
    if (at < 0) throw new Error('Snake connection renderer changed.');
    source = `import { drawCoupaHead } from './coupa-art.mjs';
const UNIT = 28;
const rect=(ctx,color,x,y,w,h)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h)};
export const drawClassicDrone = drawCoupaHead;
export function advanceClassicFlight(previous, elapsedMs, active, reduced) {
  return { timeMs: ((previous?.timeMs ?? 0) + (active && !reduced ? Math.max(0, Math.min(100, elapsedMs)) : 0)) % 60000 };
}
` + source.slice(at);
  }
  if (name === 'game/ui/render.mjs') {
    const boundary = '    if (!this.theme || !state) return;';
    if (source.split(boundary).length !== 2) throw new Error('Capture render policy boundary changed.');
    source = source.replace(boundary, `${boundary}
    brutal = false; blood = false; showCombatScrap = false;
    actorAppearance = null; actorSkins = {};`);
  }
  if (name === 'game/couch/coop-actor-presentation.mjs') {
    const boundary = "if (!next || (theme?.id !== 'fpv' && theme?.family !== 'fpv')) return Promise.resolve();";
    if (!source.includes(boundary)) throw new Error('Team actor loading boundary changed.');
    source = source.replace(boundary, 'return Promise.resolve(); // Branded actors never load global cosmetic catalogs.');
  }
  if (name === 'game/couch/coop-view.mjs') {
    const boundary = '    // Historical/unregistered painters do not infer a new opted-in appearance.';
    if (!source.includes(boundary)) throw new Error('Team render policy boundary changed.');
    source = source.replace(boundary, '    brutal = false; blood = false; actorAppearance = null;\n'+boundary);
  }
  if (name === 'game/ui/actor-recipes.mjs') {
    source = omitImports(source, ['./fpv-body-recipes.mjs']);
    source = 'const FPV_BODY_RECIPES = {}; const drawFpvBodyRecipe = () => false;\n' + source;
  }
  if (name === 'game/ui/actor-presentation.mjs') {
    source = omitImports(source, ['../presentation/military-field-art.mjs']);
    source = 'const drawMilitaryVehicleMotion = () => false;\n' + source;
    const old = "resolveEnemySkin(actor.type, actorSkins[actor.type]) ?? family(themeId, themeFamily)";
    if (!source.includes(old)) throw new Error('Actor presentation admission changed.');
    source = source.replace(old, "'coupa'");
  }
  if (['game/presentation/catalog.mjs', 'game/presentation/host.mjs', 'game/journey/reactions.mjs'].includes(name)) {
    const tree = parse(source, {ecmaVersion:'latest', sourceType:'module'});
    const removals = tree.body.filter(node => node.type === 'ImportDeclaration' && /(?:overflight|current-pictures)/.test(node.source.value));
    for (const node of removals.reverse()) {
      const declarations = node.specifiers.map(item => `const ${item.local.name} = [];`).join('\n');
      source = source.slice(0,node.start) + declarations + source.slice(node.end);
    }
  }
  return Buffer.from(source);
}
