import { t } from '../i18n/index.mjs';
import { mountDiscoveryDiagram } from './discovery-diagram.mjs';
import {
  applyExplorationAction,
  createExplorationState,
  validateExplorationPayload,
} from '../rewards/exploration.mjs';

/** Same untimed viewer for earned discoveries and isolated Studio previews.
 * It has no progress/store callbacks. All listeners and optional media owners
 * belong to this mount and are released when the caller closes its surface. */
export function mountDiscoveryExploration({
  container,
  payload: input,
  locale = 'en',
  loadImage,
} = {}) {
  const payload = validateExplorationPayload(input);
  if (!['en', 'uk'].includes(locale)) throw new TypeError('Unsupported exploration locale.');
  const document = container.ownerDocument,
    recipe = payload.recipe,
    local = (value) => value.locales[locale],
    tr = (key) => t(`interface:exploration.${key}`, { lng: locale }),
    node = (tag, text) => {
      const element = document.createElement(tag);
      if (text !== undefined) element.textContent = text;
      return element;
    },
    root = node('section'),
    cleanups = [],
    cards = new Map(),
    buttons = new Map(),
    questions = new Map();
  let state = createExplorationState(recipe),
    disposed = false;
  const listen = (element, event, callback) => {
    element.addEventListener(event, callback);
    cleanups.push(() => element.removeEventListener(event, callback));
  };
  const change = (action) => {
    if (disposed) return;
    state = applyExplorationAction(recipe, state, action);
    render();
  };
  root.className = 'discovery-exploration';
  root.setAttribute('aria-label', local(payload).title);
  const style = node(
    'style',
    '.discovery-exploration{display:grid;gap:1rem;min-width:0}.discovery-exploration p{white-space:pre-wrap;overflow-wrap:anywhere}.discovery-exploration nav{display:flex;flex-wrap:wrap;gap:.5rem}.discovery-exploration button{min-height:44px;white-space:normal;text-align:start}.discovery-exploration button[aria-pressed="true"]{border:2px solid currentColor}.discovery-exploration .discovery-compare{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,16rem),1fr));gap:1rem}.discovery-exploration article,.discovery-exploration fieldset{min-width:0;border:1px solid currentColor;border-radius:.7rem;padding:1rem}.discovery-exploration figure{margin:0}.discovery-exploration img{max-width:100%;height:auto}.discovery-exploration fieldset{display:grid;gap:.6rem}.discovery-exploration legend{font-weight:bold}.discovery-exploration .discovery-feedback{border-inline-start:3px solid currentColor;padding-inline-start:.75rem}',
  );
  const navigation = node('nav'),
    comparison = node('div'),
    status = node('p');
  navigation.setAttribute('aria-label', tr('inspect'));
  comparison.className = 'discovery-compare';
  status.setAttribute('role', 'status');
  root.append(
    style,
    node('p', local(payload).intro),
    node('p', tr('instructions')),
    navigation,
    status,
    comparison,
  );
  let diagram = null;
  if (recipe.diagram) {
    const slot = node('div');
    navigation.before(slot);
    diagram = mountDiscoveryDiagram({
      container: slot,
      recipe,
      locale,
      loadImage,
      onInspect: (cardId) => change({ type: 'inspect', cardId }),
    });
  }
  for (const card of recipe.cards) {
    const button = node('button', local(card).title);
    button.type = 'button';
    button.setAttribute('data-card-id', card.id);
    listen(button, 'click', () => change({ type: 'inspect', cardId: card.id }));
    listen(button, 'keydown', (event) => {
      const index = recipe.cards.indexOf(card),
        count = recipe.cards.length;
      const next = {
        ArrowRight: (index + 1) % count,
        ArrowLeft: (index + count - 1) % count,
        Home: 0,
        End: count - 1,
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      event.stopPropagation();
      buttons.get(recipe.cards[next].id).focus();
    });
    buttons.set(card.id, button);
    navigation.append(button);
  }
  for (const prediction of recipe.predictions) {
    const fieldset = node('fieldset'),
      feedback = node('div'),
      choiceButtons = new Map();
    feedback.className = 'discovery-feedback';
    feedback.setAttribute('role', 'status');
    feedback.setAttribute('aria-live', 'polite');
    fieldset.append(
      node('legend', tr('try')),
      node('p', local(prediction).prompt),
      node(
        'p',
        `${tr('references')}: ${prediction.cardIds.map((id) => local(recipe.cards.find((card) => card.id === id)).title).join(' · ')}`,
      ),
    );
    for (const choice of prediction.choices) {
      const button = node('button', local(choice).label);
      button.type = 'button';
      button.setAttribute('data-prediction-id', prediction.id);
      button.setAttribute('data-choice-id', choice.id);
      listen(button, 'click', () =>
        change({ type: 'predict', predictionId: prediction.id, choiceId: choice.id }),
      );
      fieldset.append(button);
      choiceButtons.set(choice.id, button);
    }
    fieldset.append(feedback);
    root.append(fieldset);
    questions.set(prediction.id, { feedback, buttons: choiceButtons });
  }
  const reset = node('button', tr('reset'));
  reset.type = 'button';
  reset.setAttribute('data-exploration-action', 'reset');
  listen(reset, 'click', () => change({ type: 'reset' }));
  root.append(reset, node('small', tr('practiceOnly')));
  container.append(root);
  function renderCard(card) {
    const element = node('article'),
      controller = new AbortController();
    let release = null;
    element.append(
      node('h4', local(card).title),
      node('p', local(card).body),
      node('p', local(card).sourceNote),
    );
    if (card.asset) {
      const figure = node('figure');
      figure.append(node('p', tr('missingImage')));
      element.append(figure);
      if (loadImage) {
        const imagePayload = {
          id: card.id,
          type: 'image',
          asset: card.asset,
          locales: card.locales,
        };
        Promise.resolve()
          .then(() => {
            if (controller.signal.aborted) return;
            return loadImage(imagePayload, figure, { signal: controller.signal });
          })
          .then((cleanup) => {
            if (typeof cleanup !== 'function') return;
            if (controller.signal.aborted) cleanup();
            else release = cleanup;
          })
          .catch(() => {
            if (!controller.signal.aborted) figure.replaceChildren(node('p', tr('missingImage')));
          });
      }
    }
    for (const id of card.sourceIds) {
      const source = recipe.sources.find((row) => row.id === id),
        link = node('a', source.title);
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      const line = node('p');
      line.append(link);
      element.append(line);
    }
    return {
      element,
      dispose() {
        controller.abort();
        release?.();
        release = null;
        element.remove();
      },
    };
  }
  function render() {
    diagram?.update(state.selectedCardIds);
    for (const [id, record] of cards)
      if (!state.selectedCardIds.includes(id)) {
        record.dispose();
        cards.delete(id);
      }
    for (const [id, button] of buttons) {
      const selected = state.selectedCardIds.includes(id);
      button.setAttribute('aria-pressed', String(selected));
      const card = recipe.cards.find((card) => card.id === id);
      button.textContent = `${selected ? '✓ ' : ''}${recipe.diagram ? `${recipe.cards.indexOf(card) + 1}. ` : ''}${local(card).title}`;
    }
    status.textContent = state.selectedCardIds.length === 2 ? tr('comparing') : tr('selectTwo');
    for (const id of state.selectedCardIds) {
      if (!cards.has(id)) cards.set(id, renderCard(recipe.cards.find((card) => card.id === id)));
      comparison.append(cards.get(id).element);
    }
    for (const prediction of recipe.predictions) {
      const view = questions.get(prediction.id),
        chosen = prediction.choices.find((row) => row.id === state.answers[prediction.id]);
      for (const [id, button] of view.buttons)
        button.setAttribute('aria-pressed', String(chosen?.id === id));
      if (!chosen) {
        view.feedback.removeAttribute('data-outcome');
        view.feedback.replaceChildren();
      } else {
        view.feedback.setAttribute(
          'data-outcome',
          chosen.id === prediction.expectedChoiceId ? 'supported' : 'reconsider',
        );
        view.feedback.replaceChildren(
          node(
            'strong',
            tr(chosen.id === prediction.expectedChoiceId ? 'supported' : 'reconsider'),
          ),
          node('p', local(chosen).feedback),
          node('p', local(prediction).explanation),
        );
      }
    }
  }
  render();
  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      cleanups.forEach((cleanup) => cleanup());
      diagram?.dispose();
      cards.forEach((card) => card.dispose());
      cards.clear();
      root.remove();
    },
  };
}
