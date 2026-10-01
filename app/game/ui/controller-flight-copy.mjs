import { t } from '../i18n/index.mjs';

/** Each optional control is an independent instruction, not an English fragment
 * interpolated into a translated sentence. Availability remains the host's decision. */
export function soloControllerFlightHint({ labels, actions, manualSupply, craftSwitch }) {
  return [
    t('gameplay:controller.steer'),
    t(actions.manualAbility ? 'common:controls.promptAbility' : 'common:controls.promptPause', {
      button: labels.ability,
    }),
    actions.manualPickup
      ? manualSupply && t('common:controls.promptSupply', { button: labels.pickup })
      : t('common:controls.promptFieldGuide', { button: labels.pickup }),
    t(craftSwitch ? 'common:controls.promptHangar' : 'common:controls.promptMissions', {
      button: labels.hangar,
    }),
    t('common:controls.promptPause', { button: labels.stop }),
    actions.manualBoost && t('common:controls.promptBoost', { button: labels.boost }),
    t('common:controls.promptPause', { button: labels.pause }),
    t('gameplay:controller.keepFlying'),
  ]
    .filter(Boolean)
    .join(' ');
}
