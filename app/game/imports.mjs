import { CLASSES } from './core/index.mjs';
import { validateScenario, inspectImageDataUrl } from './content.mjs';
import { t } from './i18n/index.mjs';

export class ScenarioImportError extends TypeError {
  constructor(message, code = 'invalid-scenario', role = null) {
    super(message);
    this.name = 'ScenarioImportError';
    this.code = code;
    if (role) this.role = role;
  }
}

/** Decode an already bounded static image, returning natural dimensions only.
 * The header guard also makes this exported helper safe to call on its own.
 * No canvas, resampling, format conversion, storage or image-byte changes occur.
 */
export async function browserDecodeImage(dataUrl) {
  const header = inspectImageDataUrl(dataUrl);
  if (!header.valid)
    throw new ScenarioImportError(
      t('errors:imports.invalidImage', { detail: header.errors.join('; ') }),
      'invalid-image',
    );
  if (typeof globalThis.Image !== 'function')
    throw new ScenarioImportError(t('errors:imports.decoderUnavailable'), 'decoder-unavailable');
  return new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const finish = (error, dimensions) => {
      if (settled) return;
      settled = true;
      image.onload = null;
      image.onerror = null;
      // Drop this temporary decode surface; the accepted pack retains its bytes.
      try {
        image.removeAttribute?.('src');
      } catch {}
      if (error) reject(error);
      else resolve(dimensions);
    };
    image.onerror = () =>
      finish(
        new ScenarioImportError(t('errors:imports.browserDecodeFailed'), 'image-decode-failed'),
      );
    image.onload = async () => {
      try {
        // decode() additionally requests complete pixel decoding when available.
        if (typeof image.decode === 'function') await image.decode();
        const naturalWidth = image.naturalWidth,
          naturalHeight = image.naturalHeight;
        if (
          !Number.isInteger(naturalWidth) ||
          !Number.isInteger(naturalHeight) ||
          naturalWidth <= 0 ||
          naturalHeight <= 0
        )
          throw new Error(t('errors:imports.emptyImageDimensions'));
        finish(null, { naturalWidth, naturalHeight });
      } catch {
        finish(
          new ScenarioImportError(t('errors:imports.completeDecodeFailed'), 'image-decode-failed'),
        );
      }
    };
    try {
      image.src = dataUrl;
    } catch {
      finish(new ScenarioImportError(t('errors:imports.browserLoadFailed'), 'image-decode-failed'));
    }
  });
}

/** Prepare an atomic import. Callers replace their current scenario only after
 * this promise resolves. The supplied candidate and registry are never mutated.
 * Injected decoders receive (dataUrl, {role}) and must resolve natural dimensions:
 * {naturalWidth, naturalHeight}. Decoding is deliberately sequential.
 */
export async function prepareScenario(
  candidate,
  { classRecipes = CLASSES, decodeImage = browserDecodeImage } = {},
) {
  // Validate the ORIGINAL first: cloning would evaluate getters and erase some
  // invalid prototypes. It also ensures every header/combined budget passes
  // before any browser image is allocated.
  const validation = validateScenario(candidate, { classRecipes });
  if (!validation.valid) throw new ScenarioImportError(validation.errors.join('; '));
  if (typeof decodeImage !== 'function')
    throw new ScenarioImportError(t('errors:imports.invalidDecoder'), 'invalid-decoder');
  const scenario = structuredClone(candidate);
  for (const key of ['walls', 'enemies', 'objectives', 'supplies'])
    if (!Object.hasOwn(scenario.level, key)) scenario.level[key] = [];
  if (!Object.hasOwn(scenario, 'classRecipes'))
    scenario.classRecipes = structuredClone(classRecipes);
  // Snapshot before the first await so later edits to the caller's candidate
  // cannot change the in-flight import or its validated image bindings.
  for (const [role, item] of Object.entries(scenario.visualOverrides)) {
    const expected = inspectImageDataUrl(item.dataUrl);
    let decoded;
    try {
      decoded = await decodeImage(item.dataUrl, { role });
    } catch (error) {
      const detail =
        typeof error?.message === 'string'
          ? error.message.slice(0, 240)
          : t('errors:imports.decodeFailed');
      throw new ScenarioImportError(
        t('errors:imports.roleDecodeFailed', { role, detail }),
        'image-decode-failed',
        role,
      );
    }
    const width = decoded?.naturalWidth,
      height = decoded?.naturalHeight;
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width !== expected.width ||
      height !== expected.height
    )
      throw new ScenarioImportError(
        t('errors:imports.dimensionsMismatch', {
          role,
          width: expected.width,
          height: expected.height,
        }),
        'image-dimensions-mismatch',
        role,
      );
  }
  return { scenario, warnings: [...(validation.warnings || [])] };
}
