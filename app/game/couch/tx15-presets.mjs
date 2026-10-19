import { emptyProfile, validateProfile } from './controller-profiles.mjs';

export function isTestedTX15(pad) {
  return (
    pad?.id === 'TX15 Joystick (Vendor: 1209 Product: 4f54)' &&
    pad.mapping === '' &&
    pad.axes?.length === 8 &&
    pad.buttons?.length === 24
  );
}

// Regular Solo/couch movement recipes; these never change FPV calibration.
export function tx15StickProfile(pad, side = 'right') {
  if (!isTestedTX15(pad) || !['right', 'left'].includes(side))
    throw new Error('This preset requires the tested TX15 USB layout.');
  const p = emptyProfile(pad, `tx15-${side}-stick`, `TX15 ${side} stick`);
  const horizontal = side === 'right' ? 0 : 3;
  const vertical = side === 'right' ? 1 : 2;
  for (const [action, index, end] of [
    ['up', vertical, 1],
    ['down', vertical, -1],
    ['right', horizontal, 1],
    ['left', horizontal, -1],
  ]) {
    const source = {
      kind: 'axis',
      index,
      center: side === 'left' && index === 2 ? 0 : 0.004,
      end,
      press: 0.5,
      release: 0.3,
    };
    p.flight[action] = [source];
    p.menu[action] = [{ ...source }];
  }
  return validateProfile(p);
}

// Explicit Solo opt-in: the whole radio belongs to one player. Shared-stick
// recipes stay movement-only, because their yaw channel belongs to player 1.
// These centres/endpoints match the tested TX15 USB Mode 2 profile; other radio
// models or transmitter mixes still require measured channel configuration.
export function tx15SoloMenuProfile(pad) {
  const profile = tx15StickProfile(pad);
  profile.id = 'tx15-full-radio-menus';
  profile.name = 'TX15 full radio menus';
  for (const [action, end] of [
    ['confirm', 1],
    ['back', -0.996],
  ])
    profile.menu[action] = [
      { kind: 'axis', index: 3, center: 0.004, end, press: 0.75, release: 0.25 },
    ];
  return validateProfile(profile);
}
