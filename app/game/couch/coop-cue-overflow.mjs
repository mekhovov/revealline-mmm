import { t } from '../i18n/index.mjs';
import { coopGroundLabel } from './coop-ground.mjs';
import { coopBonusActive } from '../coop/timed-bonuses.mjs';

/** Read-only, current-state text for an already validated Team attempt. The
 * renderer's finite packing result controls admission, never gameplay state. */
export function coopCueOverflowEntries(run) {
  if (!run || !['running', 'paused'].includes(run.status)) return [];
  const names = [t('interface:sunflower2'), t('interface:skyline2')],
    seat = (id) => `${id + 1} ${names[id]}`,
    entries = [],
    add = (id, name, state) => entries.push(Object.freeze({ id, name, state })),
    locked = (id) => t('interface:team.cueLockedPlayer', { player: seat(id) });
  for (const player of run.players) {
    const state = [];
    if (player.status === 'downed') {
      state.push(
        t(run.team.reserves === 0 ? 'interface:downFreeRescueAvailable' : 'interface:down'),
      );
      state.push(t('interface:crawlToYourPartner'));
    } else {
      state.push(player.cutting ? t('interface:lineExposed') : coopGroundLabel(run.level));
      if (player.graceUntil > run.time) state.push(t('interface:recover'));
      if (player.rescue)
        state.push(`${t('interface:holdSupportRescuing')} ${seat(player.rescue.target)}`);
      else {
        const role = t(
            player.supportRole === 'interceptor'
              ? 'interface:interceptor'
              : player.supportRole === 'disruptor'
                ? 'interface:disruptor'
                : 'interface:support',
          ),
          seconds = Math.max(0, Math.ceil((player.support?.readyAt ?? 0) - run.time));
        state.push(
          t(seconds ? 'gameplay:team.supportSeconds' : 'gameplay:team.supportReady', {
            role,
            seconds,
          }),
        );
      }
    }
    add(`player:${player.id}`, seat(player.id), state.join(' · '));
  }
  run.enemies.forEach((enemy, index) => {
    if (enemy.active === false) return;
    const role = t(
        enemy.type === 'hunter'
          ? 'interface:hunter'
          : enemy.type === 'claimed-rover'
            ? 'interface:roamer'
            : 'interface:team.cueDrifter',
      ),
      state = [];
    if (enemy.type === 'hunter')
      state.push(
        enemy.phase === 'warning' && Number.isInteger(enemy.target) && enemy.targetPoint
          ? locked(enemy.target)
          : t(
              enemy.phase === 'commit'
                ? 'interface:charge'
                : enemy.phase === 'recovery'
                  ? 'interface:recover'
                  : 'interface:team.cuePatrol',
            ),
      );
    else if (enemy.type === 'claimed-rover')
      state.push(
        t(
          enemy.rover?.mode === 'warning'
            ? 'interface:waking'
            : enemy.rover?.mode === 'active'
              ? 'interface:roamer'
              : 'interface:dormant',
        ),
      );
    else state.push(t('interface:team.cuePatrol'));
    if ((enemy.speedScale < 1 && enemy.slowUntil > run.time) || coopBonusActive(run, 'enemy-slow'))
      state.push(t('interface:slowed'));
    if (coopBonusActive(run, 'enemy-freeze')) state.push(t('interface:enemiesFrozen'));
    add(`enemy:${enemy.id}`, `${role} ${index + 1}`, state.join(' · '));
  });
  run.strongholds.forEach((hold, index) => {
    const state = [
      t(
        hold.defeated
          ? 'interface:secured'
          : hold.shielded
            ? 'interface:shield2'
            : 'interface:capture',
      ),
    ];
    if (
      !hold.defeated &&
      hold.emitter?.phase === 'warning' &&
      Number.isInteger(hold.emitter.target)
    )
      state.push(locked(hold.emitter.target));
    for (const [anchorIndex, anchor] of hold.anchors.entries())
      state.push(
        `${String.fromCharCode(65 + anchorIndex)}: ${t(anchor.captured ? 'interface:secured' : 'interface:capture')}`,
      );
    add(`core:${hold.id}`, t('interface:team.cueRelay', { number: index + 1 }), state.join(' · '));
  });
  return Object.freeze(entries);
}

export function hasCoopCueOverflow(layout) {
  return layout?.compact === true && Array.isArray(layout.unplaced) && layout.unplaced.length > 0;
}
