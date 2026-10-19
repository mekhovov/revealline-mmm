import { attachMissionLibraryBrowser } from './mission-library-browser.mjs';
import { createJourneyArtworkView } from './journey-artwork.mjs';
import { paintMissionThumbnail } from '../content-design/mission-card.mjs';
import { commitMenuRetune, menuRetuneOrigin } from './menu-retune.mjs';

/** Core presentation services around the same browser used by optional games.
 * Engines supply read-only diagrams and retain all launch/progress ownership. */
export function attachMissionLibraryChooser(options) {
  return attachMissionLibraryBrowser({
    renderPreview({ container, diagram, document: doc }) {
      const canvas = doc.createElement('canvas');
      canvas.className = 'journey-card-map';
      canvas.width = 288;
      canvas.height = (288 * diagram.height) / diagram.width;
      canvas.setAttribute('aria-hidden', 'true');
      paintMissionThumbnail(canvas.getContext('2d'), diagram, canvas.width);
      container.append(canvas);
    },
    createArtworkView: createJourneyArtworkView,
    retune: { origin: menuRetuneOrigin, commit: commitMenuRetune },
    ...options,
  });
}
