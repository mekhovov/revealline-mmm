import { t } from '../i18n/index.mjs';
import {
  createTeamOutcomeFeedback,
  prepareTeamOutcomes,
  drawTeamOutcomeBadge,
} from './coop-outcome-presentation.mjs';
import {
  prepareTeamRescue,
  teamRescueProgress,
  drawTeamRescueDecoration,
} from './coop-rescue-presentation.mjs';
import {
  prepareTeamEmitter,
  drawTeamEmitterWarning,
  drawTeamEmitterSpark,
} from './coop-emitter-presentation.mjs';
import {
  prepareTeamSupport,
  drawTeamSupportPulse,
  drawTeamSlowed,
} from './coop-support-presentation.mjs';
import { prepareTeamCores, drawTeamCoreCue } from './coop-core-presentation.mjs';
import { prepareTeamAnchors, drawTeamAnchor } from './coop-anchor-presentation.mjs';
import { canvasTextFonts } from '../text-face.mjs';
import { drawTrailImpactFront } from '../ui/actor-presentation.mjs';
import { createCoopActorPresentation } from './coop-actor-presentation.mjs';
import { drawPreparedPilotContact } from './coop-pilot-cues.mjs';
import { coopCueScale, layoutCoopCues, placeCoopCue } from './coop-actor-layout.mjs';
import {
  createCoopCaptureFeedback,
  drawCoopActiveTrail,
  drawCoopCaptureFeedback,
  drawCoopWall,
  prepareCoopWall,
} from './coop-terrain-trail.mjs';
import { paintMaterialMarker } from '../content-design/material-markers.mjs';
import { candidateTeamPictureFrame } from './candidate-team-pictures.mjs';
import { coopBonusView, drawCoopBonuses } from './coop-bonus-view.mjs';
import { coopBonusActive } from '../coop/timed-bonuses.mjs';
import {
  TEAM_PILOT_SLOTS,
  TEAM_ENEMY_SLOTS,
  TEAM_CORE_SLOTS,
} from '../presentation/team-runtime-slots.mjs';

const THEME_FONTS = Object.freeze({
  ui: '"Field Kit UI", "Field Kit Mono", system-ui, sans-serif',
  numeric: '"Field Kit Mono", ui-monospace, monospace',
});
const COLORS = ['#ffda77', '#8be0ed'];
const ACTOR_FALLBACK_PALETTE = Object.freeze({ muted: '#849fa4', accent: '#ffd279' });
const ACTOR_IMAGE_SLOTS = Object.freeze([
  'player.scout.compact',
  'player.scout.detailed',
  'enemy.bouncer',
  'enemy.border-patrol',
  'enemy.relay-sentinel',
  'enemy.claimed-rover',
]);
export const TEAM_ACTOR_APPEARANCE_SLOTS = Object.freeze([
  ...ACTOR_IMAGE_SLOTS,
  ...TEAM_PILOT_SLOTS,
  ...TEAM_ENEMY_SLOTS,
  ...TEAM_CORE_SLOTS,
]);

/** The host authenticates and owns the lease. Reject incomplete prepared actor
 * data before painting; never borrow its palette, fonts, terrain or picture. */
function prepareActorAppearance(snapshot) {
  if (typeof snapshot?.image !== 'function')
    throw new TypeError(t('interface:teamActorAppearanceNeedsAPreparedFpvSnapshot'));
  for (const slot of TEAM_ACTOR_APPEARANCE_SLOTS)
    if (!(snapshot.resolved?.assets?.[slot] ?? snapshot.canvas?.assets?.[slot]))
      throw new TypeError(`Team actor appearance is missing ${slot}.`);
  const unit = (value) => Number.isFinite(value) && value >= 0 && value <= 1;
  for (const slot of ACTOR_IMAGE_SLOTS) {
    const frame = snapshot.image(slot),
      geometry = frame?.geometry;
    if (
      !(
        Number.isFinite(frame?.image?.naturalWidth ?? frame?.image?.width) &&
        (frame.image.naturalWidth ?? frame.image.width) > 0
      ) ||
      !(
        Number.isFinite(frame?.image?.naturalHeight ?? frame?.image?.height) &&
        (frame.image.naturalHeight ?? frame.image.height) > 0
      ) ||
      !Number.isFinite(geometry?.frame?.width) ||
      geometry.frame.width <= 0 ||
      !Number.isFinite(geometry?.frame?.height) ||
      geometry.frame.height <= 0 ||
      !unit(geometry?.pivot?.x) ||
      !unit(geometry?.pivot?.y) ||
      !Array.isArray(geometry?.rotors) ||
      geometry.rotors.some(
        (anchor) =>
          !Number.isFinite(anchor?.x) ||
          !Number.isFinite(anchor?.y) ||
          !Number.isFinite(anchor?.radiusScale) ||
          anchor.radiusScale <= 0 ||
          ![2, 3, 4].includes(anchor?.bladeCount) ||
          ![1, -1].includes(anchor?.direction) ||
          !Number.isFinite(anchor?.phaseDegrees),
      )
    )
      throw new TypeError(`Team actor appearance needs a prepared frame for ${slot}.`);
  }
  const prepared = createCoopActorPresentation();
  // Retains the selected lease's state-specific/custom Team artwork, including
  // downed/rescuing pilots. Campaign role art cannot silently override FPV.
  prepared.setPresentation(snapshot);
  return prepared;
}

/** Draw the authoritative board once. Rendering never advances game state. */
export function createCoopPainter(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error(t('interface:relayRescueNeedsABrowserWithCanvas2dSupport'));
  let actors = createCoopActorPresentation(),
    actorPresentation = null,
    actorAppearanceStyle = null;
  const outcomes = createTeamOutcomeFeedback(),
    captures = createCoopCaptureFeedback();
  let presentation = null,
    cueLayout = null,
    cueLayoutCache = null,
    look = null,
    wall = null,
    anchors = Object.freeze({}),
    coreFrames = Object.freeze({}),
    supportFrames = Object.freeze({}),
    emitterFrames = Object.freeze({}),
    rescueFrames = Object.freeze({}),
    outcomeFrames = Object.freeze({});
  function setPresentation(snapshot) {
    let next = null;
    if (snapshot != null) {
      const palette = {};
      for (const key of [
        'ink',
        'paper',
        'muted',
        'accent',
        'safe',
        'danger',
        'field',
        'grid',
        'sky',
        'land',
      ]) {
        const value = snapshot.canvas?.palette?.[key];
        if (typeof value !== 'string' || !/^#[a-f0-9]{6}$/i.test(value))
          throw new TypeError(t('interface:teamPresentationNeedsAValidatedCanvasPalette'));
        palette[key] = value;
      }
      const motionScale = snapshot.canvas?.motionScale;
      if (!Number.isFinite(motionScale) || motionScale < 0 || motionScale > 1)
        throw new TypeError(t('interface:teamPresentationNeedsABoundedMotionScale'));
      const fonts = {};
      for (const key of ['ui', 'numeric']) {
        const value = snapshot.fonts?.[key];
        if (typeof value !== 'string' || !value.length || value.length > 512)
          throw new TypeError(t('interface:teamPresentationNeedsItsPreparedFontRoles'));
        fonts[key] = value;
      }
      next = { palette, motionScale, fonts };
    }
    // Keep the page lease's exact snapshot identity while capturing its display
    // values. The painter never changes or disposes shared presentation assets.
    const nextWall = prepareCoopWall(snapshot);
    const nextAnchors = prepareTeamAnchors(snapshot);
    const nextCoreFrames = prepareTeamCores(snapshot);
    const nextSupportFrames = prepareTeamSupport(snapshot);
    const nextEmitterFrames = prepareTeamEmitter(snapshot);
    const nextRescueFrames = prepareTeamRescue(snapshot);
    const nextOutcomes = prepareTeamOutcomes(snapshot);
    actors.setPresentation(snapshot ?? null);
    actorPresentation = snapshot ?? null;
    actorAppearanceStyle = null;
    presentation = snapshot ?? null;
    look = next;
    wall = nextWall;
    anchors = nextAnchors;
    coreFrames = nextCoreFrames;
    supportFrames = nextSupportFrames;
    emitterFrames = nextEmitterFrames;
    rescueFrames = nextRescueFrames;
    outcomeFrames = nextOutcomes;
    cueLayout = null;
    cueLayoutCache = null;
  }
  function paint(
    run,
    {
      reduced = false,
      textFace = 'pixel',
      textSize = 'standard',
      picture = null,
      pictureLevel = run.level,
      actorStyle = 'hybrid',
      actorAppearance = null,
      feedback = null,
      previousRun = null,
      feedbackComparison = null,
    } = {},
  ) {
    const cueScale = coopCueScale(canvas.clientWidth, run.width, textSize);
    if (actorAppearance !== null && !['fpv', 'campaign'].includes(actorAppearance?.style))
      throw new TypeError(t('interface:teamActorAppearanceNeedsASupportedStyle'));
    const selectedActors =
      actorAppearance?.style === 'fpv' ? actorAppearance.snapshot : presentation;
    let nextActors = actors;
    if (
      actorAppearance?.style === 'fpv' &&
      (actorAppearanceStyle !== 'fpv' || selectedActors !== actorPresentation)
    )
      nextActors = prepareActorAppearance(selectedActors);
    else if (selectedActors !== actorPresentation) {
      nextActors = createCoopActorPresentation();
      nextActors.setPresentation(selectedActors);
    }
    // This is a defensive arena guard, not full content-hash authority. The
    // picture lease verifies the pack/level hashes; the host owns attempt intent.
    let pictureWidth = 1152,
      pictureHeight = 576;
    if (picture !== null) {
      // The host keeps the authenticated authored picture edition separately
      // from a derived pressure recipe. Geometry and the actual simulation stay
      // owned by the run; no alternate picture edition is inferred by ID.
      if (
        pictureLevel.id !== run.level.id ||
        pictureLevel.version !== run.level.version ||
        pictureLevel.width !== run.width ||
        pictureLevel.height !== run.height
      )
        throw new TypeError(t('interface:teamPictureSourceDoesNotMatchThisArena'));
      if (picture.choice?.sourceKind === 'candidate-original') {
        const frame = candidateTeamPictureFrame(picture, pictureLevel, presentation);
        if (!frame) throw new TypeError(t('interface:teamCandidatePictureHasNoLiveVerifiedOwner'));
        pictureWidth = frame.width;
        pictureHeight = frame.height;
      }
      if (
        picture.snapshot !== presentation ||
        !presentation ||
        picture.choice?.levelId !== run.level.id ||
        picture.choice?.levelRevision !== pictureLevel.revision ||
        picture.fit !== 'contain' ||
        picture.sampling !== 'nearest' ||
        run.width !== 72 ||
        run.height !== 36 ||
        !['image', 'procedural'].includes(picture.choice.kind) ||
        (picture.choice.kind === 'procedural' ? picture.image !== null : !picture.image)
      )
        throw new TypeError(t('interface:teamPictureDoesNotMatchThisPreparedArenaPresentation'));
      if (
        picture.image &&
        ((picture.image.naturalWidth ?? picture.image.width) !== pictureWidth ||
          (picture.image.naturalHeight ?? picture.image.height) !== pictureHeight)
      )
        throw new TypeError(
          `Team picture must retain its complete ${pictureWidth}×${pictureHeight} decoded frame.`,
        );
    }
    cueLayout = null;
    actors = nextActors;
    actorPresentation = selectedActors;
    actorAppearanceStyle = actorAppearance?.style ?? null;
    const recentOutcomes = feedback ?? outcomes.observe(run),
      recentCaptures = captures.observe(run);
    const fonts = canvasTextFonts(textFace, look?.fonts ?? THEME_FONTS);
    const bonuses = coopBonusView(run),
      // Pickups scale motion separately from Support's stored velocity. Both
      // own the same visible state; neither the painter nor pause extends it.
      bonusSlowed = coopBonusActive(run, 'enemy-slow'),
      enemySlowed = (enemy) => bonusSlowed || (enemy.speedScale < 1 && enemy.slowUntil > run.time);
    const palette = look?.palette;
    const colors = palette ? [palette.accent, palette.safe] : COLORS;
    const motionScale = reduced ? 0 : (look?.motionScale ?? 1);
    reduced ||= motionScale === 0;
    actors.update(run, {
      reduced,
      motionScale,
      canvasCSSWidth: canvas.clientWidth,
      style: actorStyle,
      previousRun,
    });
    const unit = canvas.width / run.width;
    const cssCell = cueScale.cell,
      compactCues = cueScale.width < 320,
      cueRequests = [],
      cuePaint = [],
      optionalCues = [],
      occupied = [],
      heads = run.players.map((player) => {
        const radius = player.radius * cssCell + 2;
        return {
          left: player.x * cssCell - radius,
          right: player.x * cssCell + radius,
          top: player.y * cssCell - radius,
          bottom: player.y * cssCell + radius,
        };
      });
    // Functional contact points and locked destinations take precedence over
    // compact text. Body art may overlap a plate; collision geometry may not.
    if (compactCues)
      for (const enemy of run.enemies) {
        if (enemy.active === false) continue;
        const radius = enemy.radius * cssCell + 2;
        heads.push({
          left: enemy.x * cssCell - radius,
          right: enemy.x * cssCell + radius,
          top: enemy.y * cssCell - radius,
          bottom: enemy.y * cssCell + radius,
        });
        if (enemy.type === 'hunter' && enemy.phase === 'warning' && enemy.targetPoint) {
          const radius = 0.8 * cssCell;
          heads.push({
            left: enemy.targetPoint.x * cssCell - radius,
            right: enemy.targetPoint.x * cssCell + radius,
            top: enemy.targetPoint.y * cssCell - radius,
            bottom: enemy.targetPoint.y * cssCell + radius,
          });
        }
      }
    const place = (x, y, width, height, priority = 1, optional = false) => {
      const request = {
        x: x * cssCell,
        y: y * cssCell,
        width,
        height,
        priority,
      };
      const rect =
        compactCues && optional
          ? null
          : placeCoopCue({
              ...request,
              arenaWidth: cueScale.width,
              arenaHeight: run.height * cssCell,
              heads,
              occupied,
            });
      if (rect) occupied.push(rect);
      // The holder is also retained when the greedy placement failed. A later
      // complete group packing can recover that cue without losing its draw.
      const position = { rect };
      if (compactCues)
        (optional ? optionalCues : cueRequests).push({ ...request, original: rect, position });
      return position;
    };
    ctx.save();
    try {
      ctx.scale(unit, unit);
      if (picture?.image) {
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.fillStyle = palette?.field ?? '#0a202b';
      ctx.fillRect(0, 0, run.width, run.height);
      if (picture?.image) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
          picture.image,
          0,
          0,
          pictureWidth,
          pictureHeight,
          0,
          0,
          run.width,
          run.height,
        );
        // The accepted original is the victory reward. Keep the actual captured
        // cells and score intact while retiring the live arena's concealment/cues.
        if (run.status === 'won') return;
      }
      for (let y = 0; y < run.height; y++) {
        for (let x = 0; x < run.width; x++) {
          const cell = run.cells[y * run.width + x];
          if (cell === 2) {
            ctx.fillStyle = palette?.muted ?? '#4b6269';
            ctx.fillRect(x, y, 1, 1);
            drawCoopWall(ctx, wall, x, y);
          } else if (cell === 1) {
            if (picture?.image) continue;
            // Revealed land reads as a continuous orchard, independent of captor.
            const row = Math.floor(y / 5),
              col = Math.floor(x / 6);
            ctx.fillStyle = palette?.land ?? ((row + col) % 2 ? '#315744' : '#385f4a');
            ctx.fillRect(x, y, 1.01, 1.01);
            if (x === 0 || y === 0 || x === run.width - 1 || y === run.height - 1) {
              ctx.fillStyle = '#66816b';
              ctx.fillRect(x + 0.1, y + 0.1, 0.8, 0.8);
            } else if (x % 6 === 3 && y % 5 === 2) {
              ctx.fillStyle = '#93b37d';
              ctx.beginPath();
              ctx.arc(x + 0.5, y + 0.5, 0.35, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            if (picture?.image) {
              // Required picture concealment is opaque black in every theme.
              ctx.fillStyle = '#000000';
              ctx.fillRect(x, y, 1, 1);
            }
            ctx.fillStyle = palette?.grid ?? '#23414b';
            ctx.fillRect(x + 0.46, y + 0.46, 0.08, 0.08);
            const material = run.terrain?.[y * run.width + x];
            if (material === 1 || material === 2) {
              ctx.save();
              ctx.scale(1 / 16, 1 / 16);
              paintMaterialMarker(ctx, material, x * 16, y * 16, 16);
              ctx.restore();
            }
          }
        }
      }
      // Newly revealed cells illuminate below every current hazard, actor and
      // active cut, matching Solo/Versus without obscuring live danger.
      drawCoopCaptureFeedback(ctx, recentCaptures, run, palette ?? ACTOR_FALLBACK_PALETTE, reduced);
      drawCoopBonuses(ctx, bonuses, { screenScale: canvas.clientWidth / 1152 });
      // Launch markers are anchored landmarks, not compulsory meeting pads.
      for (const effect of run.supportEffects || [])
        drawTeamSupportPulse(ctx, supportFrames, effect, colors, reduced);
      // Paint every cosmetic body before functional markers and labels. Larger
      // sprites must never cover another actor's warning or a stronghold anchor.
      for (const player of run.players)
        drawTeamRescueDecoration(ctx, rescueFrames, run, player, reduced);
      const bodies = new Set();
      const body = (kind, id) => bodies.has(`${kind}:${id}`);
      for (const [kind, list] of [
        ['core', run.strongholds || []],
        ['pilot', run.players],
        ['enemy', run.enemies.filter((enemy) => enemy.active !== false)],
      ])
        for (const actor of list)
          if (actors.draw(ctx, kind, actor.id, palette ?? ACTOR_FALLBACK_PALETTE))
            bodies.add(`${kind}:${actor.id}`);
      const clearance = (kind, id, minimum) =>
        body(kind, id)
          ? Math.max(minimum, actors.frame(kind, id).diameter / 32 + cueScale.px(9) / cssCell)
          : minimum;
      function cue(
        text,
        x,
        y,
        size,
        font,
        backed = false,
        color = '#f1f7ed',
        minimum = 12,
        priority = 1,
      ) {
        ctx.save();
        size = cueScale.font(size, minimum, 18);
        const labelFont = `600 ${size}px ${font}`;
        ctx.font = labelFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const measured = ctx.measureText(text)?.width;
        const width =
          (Number.isFinite(measured) ? measured : size * text.length * 0.7) * cssCell +
          cueScale.px(6);
        const position = place(x, y, width, size * cssCell * 1.4, priority);
        const draw = () => {
          const rect = position.rect;
          if (!rect) return;
          if (backed) {
            ctx.fillStyle = '#07111c';
            ctx.fillRect(
              rect.left / cssCell,
              rect.top / cssCell,
              rect.width / cssCell,
              rect.height / cssCell,
            );
          }
          ctx.fillStyle = color;
          ctx.fillText(text, rect.x / cssCell, rect.y / cssCell);
        };
        if (compactCues)
          cuePaint.push(() => {
            ctx.save();
            ctx.font = labelFont;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            draw();
            ctx.restore();
          });
        else draw();
        ctx.restore();
      }
      function pilotBadge(player, pilotBody) {
        const frame = actors.frame('pilot', player.id),
          offset = frame?.bodyOffset,
          x = player.x + (offset?.x ?? 0) / 16,
          y = player.y + (offset?.y ?? 0) / 16,
          shape = cueScale.px(player.id === 0 ? 20 : 24),
          downed = player.status === 'downed',
          width = shape + (downed ? cueScale.px(10) : 0),
          position = place(
            x,
            y - (frame ? frame.diameter / 32 : 0.7) - (shape / 2 + cueScale.px(3)) / cssCell,
            width,
            shape,
            3,
          );
        if (!compactCues && !position.rect) return;
        const drawTether = () => {
          if (pilotBody && offset && (offset.x !== 0 || offset.y !== 0)) {
            // Dashed cosmetic tether ends at the true cutting head; it is not a trail.
            ctx.strokeStyle = '#07111c';
            ctx.lineWidth = 3 / cssCell;
            ctx.beginPath();
            ctx.moveTo(player.x, player.y);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.strokeStyle = '#f1f7ed';
            ctx.lineWidth = 1 / cssCell;
            ctx.setLineDash([2 / cssCell, 2 / cssCell]);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        };
        const drawBadge = () => {
          const rect = position.rect;
          if (!rect) return;
          const cx = (rect.left + shape / 2) / cssCell,
            cy = rect.y / cssCell,
            radius = shape / 2 / cssCell;
          ctx.save();
          ctx.fillStyle = '#07111c';
          ctx.strokeStyle = colors[player.id];
          ctx.lineWidth = 1.5 / cssCell;
          if (!downed && player.graceUntil > run.time) ctx.setLineDash([2 / cssCell, 2 / cssCell]);
          ctx.beginPath();
          if (player.id === 0) ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          else {
            ctx.moveTo(cx, cy - radius);
            ctx.lineTo(cx + radius, cy);
            ctx.lineTo(cx, cy + radius);
            ctx.lineTo(cx - radius, cy);
            ctx.closePath();
          }
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.font = `600 ${cueScale.font(0.66, 14, 18)}px ${fonts.numeric}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#f1f7ed';
          ctx.fillText(String(player.id + 1), cx, cy);
          if (downed) {
            ctx.fillStyle = '#07111c';
            ctx.fillRect(
              (rect.right - cueScale.px(10)) / cssCell,
              (rect.y - cueScale.px(8)) / cssCell,
              cueScale.px(10) / cssCell,
              cueScale.px(16) / cssCell,
            );
            ctx.fillStyle = '#f1f7ed';
            ctx.font = `600 ${cueScale.px(12) / cssCell}px ${fonts.numeric}`;
            ctx.fillText('+', (rect.right - cueScale.px(5)) / cssCell, cy);
          }
          if (!compactCues) drawTether();
          ctx.restore();
        };
        if (compactCues) cuePaint.push(drawBadge);
        else drawBadge();
        if (compactCues) {
          ctx.save();
          drawTether();
          ctx.restore();
        }
        const rescue = rescueFrames['team.rescue.progress']
          ? teamRescueProgress(run, player)
          : null;
        if (rescue || (frame?.pilotState === 'rescuing' && Number.isInteger(frame.rescueTarget)))
          cue(
            rescue
              ? t('interface:team.cueRescueProgressCompact', {
                  player: rescue.target + 1,
                  percent: Math.floor(rescue.progress * 100),
                })
              : t('interface:team.cueRescueCompact', { player: frame.rescueTarget + 1 }),
            x,
            ((position.rect?.bottom ?? y * cssCell) + cueScale.px(12)) / cssCell,
            0.66,
            fonts.ui,
            true,
            '#f1f7ed',
            14,
            3,
          );
      }
      for (const stronghold of run.strongholds || []) {
        const coreBody = body('core', stronghold.id);
        const relayLabel =
          run.strongholds.length > 1 ? `${run.strongholds.indexOf(stronghold) + 1}` : '';
        for (const [i, anchor] of stronghold.anchors.entries()) {
          const decorated = drawTeamAnchor(ctx, anchors, anchor, palette);
          // Keep a 12px readable label outside replacement artwork, including
          // small Studio/handheld canvases. Legacy cue placement stays exact.
          const labelOffset = 0.7 + cueScale.px(12) / cssCell;
          const labelY = decorated
            ? anchor.y + labelOffset < run.height - 0.6
              ? anchor.y + labelOffset
              : anchor.y - labelOffset
            : anchor.y;
          ctx.fillStyle = '#fff1c8';
          ctx.font = `600 0.85px ${fonts.ui}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          cue(
            anchor.captured ? '✓' : `${relayLabel}${String.fromCharCode(65 + i)}`,
            anchor.x,
            labelY,
            0.85,
            fonts.ui,
            true,
            '#fff1c8',
          );
        }
        const core = stronghold.core;
        const coreColor = drawTeamCoreCue(ctx, coreFrames, stronghold, palette);
        cue(
          `${relayLabel ? `${relayLabel} ` : ''}${stronghold.defeated ? t('interface:secured') : stronghold.shielded ? t('interface:shield2') : t('interface:capture')}`,
          core.x,
          Math.max(0.6, core.y - clearance('core', stronghold.id, 1.75)),
          0.64,
          fonts.ui,
          coreBody,
          coreColor,
        );
        const emitter = stronghold.emitter;
        if (emitter?.phase === 'warning' && Number.isInteger(emitter.cellIndex)) {
          const x = (emitter.cellIndex % run.width) + 0.5,
            y = Math.floor(emitter.cellIndex / run.width) + 0.5;
          drawTeamEmitterWarning(ctx, emitterFrames, core, { x, y }, palette);
        }
      }
      for (const enemy of run.enemies) {
        if (
          enemy.active === false ||
          enemy.type !== 'hunter' ||
          enemy.phase !== 'warning' ||
          !enemy.targetPoint
        )
          continue;
        ctx.strokeStyle = '#ffd279';
        ctx.lineWidth = 0.1;
        ctx.setLineDash([0.25, 0.35]);
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y);
        ctx.lineTo(enemy.targetPoint.x, enemy.targetPoint.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(enemy.targetPoint.x, enemy.targetPoint.y, 0.75, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#ffd279';
        ctx.font = `600 0.65px ${fonts.ui}`;
        ctx.textAlign = 'center';
        cue(
          `${t('interface:team.cueLockCompact', { player: enemy.target + 1 })}${compactCues && enemySlowed(enemy) ? ' ↓' : ''}`,
          enemy.x,
          Math.max(0.6, enemy.y - clearance('enemy', enemy.id, 1.1)),
          0.65,
          fonts.ui,
          body('enemy', enemy.id),
          '#ffd279',
          12,
          3,
        );
      }
      for (const [i, spawn] of run.level.spawns.entries()) {
        ctx.strokeStyle = colors[i];
        ctx.lineWidth = 0.08;
        ctx.beginPath();
        ctx.arc(spawn.x, spawn.y, 0.9, 0, Math.PI * 2);
        ctx.stroke();
      }
      const preparedPilotContacts = new Map();
      for (const player of run.players) {
        ctx.strokeStyle = colors[player.id];
        ctx.fillStyle = colors[player.id];
        ctx.lineJoin = 'round';
        ctx.lineWidth = 0.28;
        if (presentation) {
          drawCoopActiveTrail(ctx, player, colors[player.id], {
            time: run.time * motionScale,
            reduced,
            cssCell,
          });
        } else if (player.trail.length) {
          ctx.globalAlpha = 0.28;
          for (const cell of player.trail) ctx.fillRect(cell.x, cell.y, 1, 1);
          ctx.globalAlpha = 1;
          ctx.beginPath();
          const anchor = player.safeAnchor;
          ctx.moveTo(anchor.x, anchor.y);
          for (const cell of player.trail) ctx.lineTo(cell.x + 0.5, cell.y + 0.5);
          ctx.lineTo(player.x, player.y);
          ctx.stroke();
        }
        const downed = player.status === 'downed',
          pilotBody = body('pilot', player.id);
        ctx.save();
        ctx.translate(player.x, player.y);
        if (!downed && player.graceUntil > run.time) {
          ctx.strokeStyle = rescueFrames['team.player.recovery'] ? palette.safe : '#e6ffcf';
          ctx.lineWidth = 0.12;
          ctx.setLineDash([0.2, 0.18]);
          ctx.beginPath();
          ctx.arc(0, 0, 0.95, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.strokeStyle = colors[player.id];
        }
        if (!reduced && player.cutting && !downed) {
          ctx.globalAlpha = 0.18;
          ctx.beginPath();
          ctx.arc(0, 0, 0.85 + Math.sin(run.time * 5 * motionScale) * 0.08, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (!pilotBody) {
          ctx.fillStyle = '#172c34';
          ctx.lineWidth = 0.12;
          ctx.beginPath();
          if (player.id === 0) ctx.arc(0, 0, 0.58, 0, Math.PI * 2);
          else {
            ctx.moveTo(0, -0.72);
            ctx.lineTo(0.67, 0);
            ctx.lineTo(0, 0.72);
            ctx.lineTo(-0.67, 0);
            ctx.closePath();
          }
          ctx.fill();
          ctx.stroke();
        }
        if (pilotBody) {
          // Retain exact physical geometry for the final foreground pass. A
          // filled marker here or later would hide the prepared battery/camera.
          preparedPilotContacts.set(player.id, {
            x: player.x,
            y: player.y,
            radius: player.radius,
            color: colors[player.id],
          });
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
          ctx.fillStyle = colors[player.id];
          ctx.fill();
        }
        ctx.restore();
        pilotBadge(player, pilotBody);
      }
      for (const enemy of run.enemies) {
        if (enemy.active === false) continue;
        const enemyBody = body('enemy', enemy.id);
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        if (enemyBody) {
          // Shared body drawing includes a contact cue, but later body images
          // can cover it. Restore the actual footprint in this final overlay.
          ctx.strokeStyle = '#07111c';
          ctx.lineWidth = 3 / 16;
          ctx.beginPath();
          ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = '#f1f7ed';
          ctx.lineWidth = 1 / 16;
          ctx.stroke();
          ctx.fillStyle = '#07111c';
          ctx.fillRect(-2 / 16, -2 / 16, 4 / 16, 4 / 16);
          ctx.fillStyle = '#f1f7ed';
          ctx.fillRect(-1 / 16, -1 / 16, 2 / 16, 2 / 16);
        }
        if (!enemyBody) {
          ctx.fillStyle =
            enemy.phase === 'warning' || enemy.rover?.mode === 'warning'
              ? '#ffd279'
              : (enemy.type === 'hunter' && enemy.phase !== 'commit') ||
                  (enemy.type === 'claimed-rover' && enemy.rover?.mode !== 'active')
                ? '#849fa4'
                : '#fc786f';
          ctx.strokeStyle = '#ffc0a1';
          ctx.lineWidth = 0.08;
          ctx.beginPath();
          if (enemy.type === 'hunter') {
            ctx.moveTo(0, -0.65);
            ctx.lineTo(0.55, 0);
            ctx.lineTo(0, 0.65);
            ctx.lineTo(-0.55, 0);
          } else if (enemy.type === 'claimed-rover') {
            ctx.rect(-0.48, -0.4, 0.96, 0.8);
            ctx.fillRect(-0.65, -0.55, 0.2, 1.1);
            ctx.fillRect(0.45, -0.55, 0.2, 1.1);
          } else {
            ctx.moveTo(0, -0.6);
            ctx.lineTo(0.58, 0.42);
            ctx.lineTo(-0.58, 0.42);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#521f2a';
          ctx.fillRect(-0.1, -0.1, 0.2, 0.2);
        }
        const slowed = enemySlowed(enemy);
        // On compact boards, an active state replaces the redundant idle role
        // caption. Charge/lock/recovery keep their full caption with the Help-
        // labelled slowdown glyph; the existing dashed slow ring also remains.
        const idleSlowed = compactCues && slowed && enemy.phase === 'patrol';
        if (enemy.type === 'hunter' && enemy.phase !== 'warning' && !idleSlowed) {
          ctx.fillStyle = '#eee7c8';
          ctx.font = `600 0.57px ${fonts.ui}`;
          ctx.textAlign = 'center';
          ctx.restore();
          cue(
            (enemy.phase === 'commit'
              ? t('interface:charge')
              : enemy.phase === 'recovery'
                ? t('interface:recover')
                : t('interface:hunter')) + (compactCues && slowed ? ' ↓' : ''),
            enemy.x,
            Math.max(0.6, enemy.y - clearance('enemy', enemy.id, 1.05)),
            0.57,
            fonts.ui,
            enemyBody,
            '#eee7c8',
          );
          ctx.save();
          ctx.translate(enemy.x, enemy.y);
        }
        if (enemy.type === 'claimed-rover') {
          ctx.restore();
          cue(
            enemy.rover?.mode === 'warning'
              ? t('interface:waking')
              : enemy.rover?.mode === 'active'
                ? t('interface:roamer')
                : t('interface:dormant'),
            enemy.x,
            Math.max(0.6, enemy.y - clearance('enemy', enemy.id, 1.05)),
            0.57,
            fonts.ui,
            enemyBody,
            '#f1f7ed',
          );
          ctx.save();
          ctx.translate(enemy.x, enemy.y);
        }
        // Authoritative active time keeps this cue visible through pause and reduced effects.
        if (slowed) {
          const slowedColor = drawTeamSlowed(ctx, supportFrames, palette);
          ctx.restore();
          if (!(compactCues && enemy.type === 'hunter' && enemy.phase !== 'patrol'))
            cue(
              t('interface:slowed'),
              enemy.x,
              Math.min(run.height - 0.6, enemy.y + clearance('enemy', enemy.id, 1.25)),
              0.6,
              fonts.ui,
              enemyBody,
              slowedColor,
            );
          ctx.save();
          ctx.translate(enemy.x, enemy.y);
        }
        ctx.restore();
      }
      for (const player of run.players) {
        const contact = preparedPilotContacts.get(player.id);
        if (contact) {
          // Keep the unfilled pilot footprint above every actor and enemy cue.
          // The separate number/shape badge and recovery ring retain their roles.
          ctx.save();
          ctx.translate(contact.x, contact.y);
          drawPreparedPilotContact(
            ctx,
            contact.radius,
            contact.color,
            cssCell,
            feedbackComparison?.contactStyle,
          );
          ctx.restore();
        } else {
          ctx.fillStyle = colors[player.id];
          ctx.strokeStyle = '#07111c';
          ctx.lineWidth = 1 / cssCell;
          ctx.beginPath();
          ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }
      for (const [index, outcome] of recentOutcomes.entries()) {
        if (!['running', 'paused'].includes(run.status)) break;
        const label =
          outcome.slot === 'team.capture.joint' ? '1 + 2 · JOINT CUT' : '1 + 2 · TEAM RECOVERY';
        const size = cueScale.font(0.75, 12, 18);
        ctx.font = `600 ${size}px ${fonts.ui}`;
        const width =
          (ctx.measureText(label)?.width ?? size * label.length * 0.7) * cssCell + cueScale.px(38);
        const position = place(
          run.width / 2,
          cueScale.px(18 + index * 34) / cssCell,
          width,
          cueScale.px(28),
          0,
          true,
        );
        if (!compactCues && !position.rect) continue;
        const outcomeFont = ctx.font;
        const drawOutcome = () => {
          const rect = position.rect;
          if (!rect) return;
          drawTeamOutcomeBadge(
            ctx,
            outcomeFrames[outcome.slot],
            rect,
            cssCell,
            colors,
            reduced,
            run.time - outcome.time,
          );
          ctx.save();
          ctx.fillStyle = '#07111c';
          ctx.fillRect(
            (rect.left + cueScale.px(28)) / cssCell,
            rect.top / cssCell,
            (rect.width - cueScale.px(28)) / cssCell,
            rect.height / cssCell,
          );
          ctx.fillStyle = palette?.ink ?? '#f3f0db';
          ctx.font = outcomeFont;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(label, (rect.left + cueScale.px(32)) / cssCell, rect.y / cssCell);
          ctx.restore();
        };
        if (compactCues) cuePaint.push(drawOutcome);
        else drawOutcome();
      }
      if (compactCues) {
        const geometry = { arenaWidth: cueScale.width, arenaHeight: run.height * cssCell, heads },
          measurements = cueRequests.map(({ position: _position, ...request }) => request),
          key = JSON.stringify([geometry, measurements]),
          cached = cueLayoutCache?.key === key;
        const layout = cached ? cueLayoutCache.layout : layoutCoopCues(measurements, geometry);
        if (!cached) cueLayoutCache = { key, layout };
        // Apply a complete packing atomically. Partial placement must not move
        // one warning underneath another still using its visible fallback.
        if (!layout.unplaced.length)
          cueRequests.forEach((request, index) => {
            request.position.rect = layout.placements[index];
          });
        const required = cueRequests.map((request) => request.position.rect).filter(Boolean);
        // Celebration banners are optional. They never enter the required cue
        // packing and may occupy only space left by functional labels/contacts.
        for (const request of optionalCues) {
          const rect = placeCoopCue({ ...request, ...geometry, occupied: required });
          if (
            rect &&
            !required.some(
              (other) =>
                rect.left < other.right &&
                rect.right > other.left &&
                rect.top < other.bottom &&
                rect.bottom > other.top,
            )
          ) {
            request.position.rect = rect;
            required.push(rect);
          }
        }
        cueLayout = Object.freeze({
          requested: cueRequests.length,
          painted: cueRequests.filter((request) => request.position.rect).length,
          unplaced: Object.freeze([...layout.unplaced]),
          exhausted: layout.exhausted,
          strategy: layout.unplaced.length ? 'visible-fallback' : 'packed',
          cached,
          optionalOmitted: optionalCues.filter((request) => !request.position.rect).length,
          compact: true,
        });
        for (const draw of cuePaint) draw();
      } else cueLayoutCache = null;
      for (const impact of run.impacts || []) {
        const x = Number.isFinite(impact.x) ? impact.x : (impact.cellIndex % run.width) + 0.5;
        const y = Number.isFinite(impact.y)
          ? impact.y
          : Math.floor(impact.cellIndex / run.width) + 0.5;
        if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
        if (impact.version === 'team-line-impact.v2') {
          ctx.save();
          ctx.scale(1 / 16, 1 / 16);
          drawTrailImpactFront(
            ctx,
            { x, y, direction: impact.direction },
            {
              time: run.time * motionScale,
              reduced,
              screenScale: cssCell / 16,
            },
          );
          ctx.restore();
        } else drawTeamEmitterSpark(ctx, emitterFrames, { x, y }, palette);
      }
    } finally {
      ctx.restore();
    }
  }
  return {
    paint,
    observe(run) {
      outcomes.observe(run);
      captures.observe(run);
    },
    setPresentation,
    actorFrame: (kind, id) => actors.frame(kind, id),
    get presentation() {
      return presentation;
    },
    get cueLayout() {
      return cueLayout;
    },
  };
}
