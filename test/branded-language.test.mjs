import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('branded English messages override inherited copy and preserve interpolation', async () => {
  const writes = [];
  const context = vm.createContext({
    Intl,
    setTimeout,
    clearTimeout,
    navigator: { languages: ['uk-UA'], language: 'uk-UA' },
    localStorage: {
      getItem: () => 'uk',
      setItem: (key, value) => writes.push([key, value]),
    },
  });
  for (const path of [
    'vendor/i18next-26.4.2.min.js',
    'i18n/catalogs.mjs',
    'i18n/bootstrap.mjs',
  ]) {
    vm.runInContext(await readFile(new URL(`../app/game/${path}`, import.meta.url), 'utf8'), context, {
      filename: path,
      timeout: 5000,
    });
  }
  const language = context.RevealLineI18n;
  assert.equal(language.getLocale(), 'en');
  assert.ok(language.t('interface:couchCoOp').includes('[[slot0]]'), 'The Team header must retain its live mission-label slot');
  assert.throws(() => language.setLocale('uk'), /Unsupported locale/);
  language.setLocale('en');
  assert.equal(language.getLocale(), 'en');
  assert.ok(writes.every(([key]) => key.startsWith('revealline-mmm.')));
  assert.equal(language.t('errors:loadingFlightSystems'), 'Loading your game…');
  assert.equal(language.t('interface:loadingMissionsAndFlightEquipment'), 'Loading your missions…');
  assert.equal(language.t('errors:flightOnHold'), 'Unable to open the game.');
  assert.equal(
    language.t('gameplay:lineSecuredRevealedTapADirectionToFlyAgain', { value1: 75 }),
    'Line secured. 75% revealed. Tap a direction to move again.',
  );
  assert.equal(
    language.t('gameplay:tuning.motion', { count: 1, speed: 2, admin: '' }),
    '1 hazard · 2 cells/s.',
  );
  assert.equal(
    language.t('gameplay:tuning.motion', { count: 3, speed: 2, admin: ' (practice)' }),
    '3 hazards · 2 cells/s (practice).',
  );
  assert.match(
    language.t('interface:enemyGuide.practiceInstructions', { advice: 'Keep connecting.' }),
    /^Keep connecting\. Move with direction taps;/,
  );
});
