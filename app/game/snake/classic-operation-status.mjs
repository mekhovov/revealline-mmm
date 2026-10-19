import { operationActivationsMet } from './classic-routing-v5.mjs';

/** One compact, localized objective projection for live boards and review fixtures. */
export function classicOperationStatus(run, locale = 'en') {
  const recipe = run.level.operation,
    state = run.operation;
  if (!recipe || !state) return '';
  const copy = (en, uk) => (locale === 'uk' ? uk : en);
  const stage = recipe.stages[state.stage];
  if (!stage) return copy('Operation complete', 'Операцію завершено');
  const parts = [
    copy(
      `Stage ${state.stage + 1}/${recipe.stages.length}`,
      `Етап ${state.stage + 1}/${recipe.stages.length}`,
    ),
  ];
  const delivered = stage.deliveries.filter((id) =>
    state.parcels.some((p) => p.id === id && p.state === 'delivered'),
  ).length;
  if (stage.catches)
    parts.push(
      copy(`Catches ${run.catches}/${stage.catches}`, `Цілі ${run.catches}/${stage.catches}`),
    );
  if (stage.deliveries.length)
    parts.push(
      copy(
        `Delivered ${delivered}/${stage.deliveries.length}`,
        `Доставлено ${delivered}/${stage.deliveries.length}`,
      ),
    );
  for (const goal of stage.activations ?? []) {
    const progress = (goal.kind === 'switchyard' ? state.switchyards : state.plates).find(
      (s) => s.id === goal.id,
    );
    const count = Math.min(
      goal.count,
      goal.kind === 'switchyard' ? progress.toggles : progress.activations,
    );
    parts.push(
      copy(
        `${goal.kind === 'switchyard' ? 'Switch' : 'Plate'} ${count}/${goal.count}`,
        `${goal.kind === 'switchyard' ? 'Перемикач' : 'Плита'} ${count}/${goal.count}`,
      ),
    );
  }
  if (
    stage.exit &&
    run.catches >= stage.catches &&
    delivered === stage.deliveries.length &&
    operationActivationsMet(run, stage)
  )
    parts.push(copy('Reach the arrow →', 'До стрілки →'));
  return parts.join(' · ');
}
