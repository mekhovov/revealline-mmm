import { paintMissionThumbnail } from './mission-card.mjs';
import { contentText } from '../i18n/content.mjs';
import { localizedText, t } from '../i18n/index.mjs';

const difficulty = (value) => t(`interface:missionLibrary.difficulty.${value}`);

/** Owned Journey decoration, injected by the selected Journey entry. Legacy
 * discovery does not import the content compiler or Solo simulation for cards.
 * Identity, not imported IDs, grants access to the owned initial-state diagram. */
export function createTeamMissionCardPresenter(journey, progress, { reviewCopy = true } = {}) {
  return ({ document, row, card }) => {
    const owned = row.journeyRow;
    if (!journey.owns(owned)) return false;
    const diagram = journey.card(owned.mission, owned.difficulty),
      profile = progress?.snapshot(),
      receipt = profile?.clears.team[owned.mission.id];
    const detail = document.createElement('p');
    detail.className = 'team-mission-difficulty';
    localizedText(detail, () =>
      t('interface:missionLibrary.team.challengeBand', {
        band: diagram.band,
        difficulty: difficulty(diagram.preset),
      }),
    );
    const completion = document.createElement('p');
    completion.className = 'team-mission-completion';
    if (receipt) {
      const edition = journey.row(owned.mission, receipt.difficulty);
      localizedText(completion, () =>
        t('interface:missionLibrary.team.clearStatus', {
          state:
            receipt.gameplayId === edition?.simulationIdentity
              ? t('interface:missionLibrary.team.cleared')
              : t('interface:missionLibrary.team.earlierEditionCleared'),
          difficulty: difficulty(receipt.difficulty),
          edition:
            receipt.difficulty === owned.difficulty &&
            receipt.gameplayId === owned.simulationIdentity
              ? t('interface:missionLibrary.team.selectedEdition')
              : t('interface:missionLibrary.team.noSelectedEditionClear'),
        }),
      );
    } else
      localizedText(completion, () =>
        profile?.skipped.team.includes(owned.mission.id)
          ? t('interface:missionLibrary.team.skippedRevisit')
          : t('interface:missionLibrary.team.notCleared'),
      );
    const route = document.createElement('p');
    route.className = 'team-mission-route';
    localizedText(route, () => contentText(diagram, 'route'));
    const mastery = document.createElement('p');
    mastery.className = 'team-mission-mastery';
    localizedText(mastery, () => contentText(diagram, 'mastery'));
    const optional = document.createElement('details'),
      summary = document.createElement('summary');
    optional.className = 'team-mission-optional';
    localizedText(summary, () => t('interface:missionLibrary.team.optionalGoalNotTracked'));
    optional.append(summary, mastery);
    const figure = document.createElement('figure'),
      canvas = document.createElement('canvas'),
      caption = document.createElement('figcaption');
    figure.className = 'team-discovery-teaser team-mission-diagram';
    canvas.width = 288;
    canvas.height = Math.round((288 * diagram.height) / diagram.width);
    canvas.setAttribute('aria-hidden', 'true');
    caption.className = 'team-discovery-teaser-message';
    const artStatus = () =>
      owned.background
        ? reviewCopy
          ? t('interface:missionLibrary.team.artTestPending')
          : t('interface:missionLibrary.team.winToRevealArtwork')
        : t('interface:missionLibrary.team.artworkPending');
    localizedText(caption, () =>
      t('interface:missionLibrary.team.startingMapCaption', { artStatus: artStatus() }),
    );
    try {
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      paintMissionThumbnail(context, diagram, canvas.width);
    } catch {
      canvas.hidden = true;
      localizedText(caption, () =>
        t('interface:missionLibrary.team.diagramUnavailable', { artStatus: artStatus() }),
      );
    }
    figure.append(canvas, caption);
    card.append(detail, completion, figure, route, optional);
    return true;
  };
}
