import { localizedText } from '../i18n/index.mjs';
import { huntText } from '../hunt/copy.mjs';
import { createHuntRecords, runHuntSummary } from '../hunt/records.mjs';
import { snakeSummary } from '../snake/rules.mjs';
import { snakeText } from '../snake/copy.mjs';

export function attachHuntStatus({
  document: doc = globalThis.document,
  container,
  mode = 'solo',
  getStorage,
  record = true,
  records: sharedRecords = null,
} = {}) {
  const node = doc.createElement('p');
  node.className = 'hunt-status micro-note';
  node.hidden = true;
  node.setAttribute('aria-live', 'off');
  container?.append(node);
  const records = sharedRecords ?? createHuntRecords(getStorage ? { getStorage } : {});
  let current = null,
    previous = '';
  const copy = () => {
    if (!current) return '';
    const stats = runHuntSummary(current);
    if (!stats) return '';
    const best = records.best(current, mode);
    const snake = snakeSummary(current);
    const bonusMode = current.level.snake?.bonus;
    const snakeStatus = snake
      ? ` · ${snakeText('tail')}: ${snake.capacities.map((capacity, i) => `${Math.round(snake.lengths[i])}/${capacity}`).join(' | ')}${bonusMode === 'chain' ? ` · ${snakeText('chain')}: ${snake.chain}` : ''}${snake.nextTargetId ? ` · ${snakeText('next')}: ${current.level.snake.order.indexOf(snake.nextTargetId) + 1}` : ''}${bonusMode !== 'none' ? ` · ${snakeText('bonus')}: ${snake.bonusScore}` : ''}`
      : '';
    const goal =
      stats.mode === 'bonus'
        ? huntText('bonusGoal')
        : stats.mode === 'hunt'
          ? huntText('huntGoal')
          : huntText('quotaGoal');
    const detail = `${goal} ${huntText('targets')}: ${stats.kills}/${stats.mode === 'capture-quota' ? stats.quota : stats.total} · ${huntText('remaining')}: ${stats.remaining} · ${huntText('score')}: ${stats.score} · ${huntText('touch')}: ${stats.touchKills} · ${huntText('enclosed')}: ${stats.captureKills}${best ? ` · ${huntText('best')}: ${best.score}` : ''}${current.status === 'won' && best ? ` · ${[best.all && huntText('all'), best.contact && huntText('contactMastery'), best.clean && huntText('clean')].filter(Boolean).join(' · ')}` : ''}`;
    const terminal = !['ready', 'running', 'respawning', 'paused'].includes(current.status);
    node.dataset.huntDetail = terminal ? 'result' : 'live';
    if (node.title !== detail + snakeStatus) node.title = detail + snakeStatus;
    return terminal
      ? detail + snakeStatus
      : `${snake ? snakeText('title') : huntText(stats.mode)} · ${stats.kills}/${stats.mode === 'capture-quota' ? stats.quota : stats.total} · ${huntText('score')}: ${stats.score}${snakeStatus}`;
  };
  return Object.freeze({
    render(run) {
      current = run;
      node.hidden = !runHuntSummary(run ?? {});
      if (node.hidden) return;
      if (record) records.complete(run, mode);
      const next = copy();
      if (next !== previous) {
        previous = next;
        localizedText(node, copy);
      }
    },
    dispose() {
      current = null;
      if (!sharedRecords) records.dispose();
      node.remove();
    },
  });
}
