import { localizedText } from '../i18n/index.mjs';
import { huntText } from '../hunt/copy.mjs';
import { createHuntRecords, runHuntSummary, runHuntMilestones } from '../hunt/records.mjs';
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
    const styles = [
      ['all', 'all'],
      ['contact', 'contactMastery'],
      ['clean', 'clean'],
    ];
    const earned = (facts) =>
      styles
        .filter(([key]) => facts[key])
        .map(([, label]) => huntText(label))
        .join(' · ') || huntText('none');
    const attemptStyles = runHuntMilestones(current);
    const attempt = `${huntText('attempt')}: ${goal} ${huntText('targets')}: ${stats.kills}/${stats.total}${stats.mode === 'capture-quota' ? ` · ${huntText('quota')}: ${stats.kills}/${stats.quota}` : ''} · ${huntText('remaining')}: ${stats.remaining} · ${huntText('score')}: ${stats.score} · ${huntText('touch')}: ${stats.touchKills} · ${huntText('enclosed')}: ${stats.captureKills}${attemptStyles ? ` · ${huntText('attemptStyles')}: ${earned(attemptStyles)}` : ''}${snakeStatus}`;
    const personal = `${huntText('personal')}: ${best ? `${huntText('best')}: ${best.score} · ${huntText('earned')}: ${earned(best)}` : huntText('noRecord')}`;
    const missing = styles.find(([key]) => !best?.[key]);
    const allRequired =
      stats.mode === 'hunt' || (stats.mode === 'capture-quota' && stats.quota === stats.total);
    const nextGoal = missing
      ? `${huntText(allRequired ? 'requiredStyleOrder' : 'styleOrder')}: ${styles.map(([, label]) => huntText(label)).join(' → ')}.${allRequired ? ` ${huntText('requiredAllStyle')}` : ''} ${huntText('nextStyle')}: ${huntText(missing[1])}.`
      : huntText('stylesComplete');
    const terminal = !['ready', 'running', 'respawning', 'paused'].includes(current.status);
    const detail = [
      attempt,
      personal,
      nextGoal,
      ...(terminal && !records.snapshot().durable ? [huntText('sessionProgress')] : []),
    ].join('\n');
    node.dataset.huntDetail = terminal ? 'result' : 'live';
    if (node.title !== detail) node.title = detail;
    return terminal
      ? detail
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
