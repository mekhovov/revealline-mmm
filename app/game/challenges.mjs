import { generateLevel } from './generator.mjs';
import { validateLevel, CLASSES } from './core/index.mjs';
export function challengeCampaign(date, kind = 'daily', classRecipes = CLASSES) {
  if (
    !/^\d{4}-\d\d-\d\d$/.test(date) ||
    new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date
  )
    throw new Error('Choose a valid board date.');
  if (!['daily', 'calm', 'expert'].includes(kind)) throw new Error('Unknown challenge.');
  const level = generateLevel(`route-${date}`);
  level.id = `route-${date}-${kind}`;
  level.name = `${kind === 'calm' ? 'Open skies' : kind === 'expert' ? 'Pressure run' : 'Daily route'} · ${date}`;
  const factor = kind === 'calm' ? 0.55 : kind === 'expert' ? 1.45 : 1;
  level.enemies.forEach((e) => {
    e.vx *= factor;
    e.vy *= factor;
  });
  level.rules = { lives: kind === 'calm' ? 5 : kind === 'expert' ? 2 : 3 };
  if (kind === 'calm') level.goal.coverage = 0.5;
  if (kind === 'expert') level.goal.coverage = 0.75;
  if (!validateLevel(level).valid) throw new Error('Challenge validation failed.');
  return {
    version: 'xonix-campaign.v1',
    id: `route-${date}-${kind}`,
    revision: '1',
    name: level.name,
    briefs: [
      `${level.name}. ${kind === 'calm' ? 'Slower enemies and five lives.' : kind === 'expert' ? 'Faster enemies, two lives and a larger reveal target.' : 'A repeatable board for this date.'} Capture the marked objective. Available whenever you return.`,
    ],
    levels: [level],
    classRecipes,
  };
}
