/** Authoring and runtime use the same explicit Team role boundary. An additive
 * project catalog never upgrades an earlier mission's qualified behavior. */
export const TEAM_MISSION_FORMATS = Object.freeze([
  'TeamMissionV1',
  'TeamMissionV2',
  'TeamMissionV3',
  'TeamMissionV4',
  'TeamMissionV5',
  'TeamMissionV6',
  'TeamMissionV7',
  'TeamMissionV8',
  'TeamMissionV9',
  'TeamMissionV10',
]);
export const teamRoleQualified = (format, role) =>
  TEAM_MISSION_FORMATS.includes(format) &&
  (role === 'field-keeper' ||
    ([
      'TeamMissionV3',
      'TeamMissionV4',
      'TeamMissionV5',
      'TeamMissionV6',
      'TeamMissionV7',
      'TeamMissionV8',
      'TeamMissionV10',
    ].includes(format) &&
      role === 'reclaimed-roamer') ||
    (['TeamMissionV7', 'TeamMissionV8'].includes(format) &&
      ['optional-scout', 'optional-sentry'].includes(role)));
