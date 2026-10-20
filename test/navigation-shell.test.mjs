import test from 'node:test';
import assert from 'node:assert/strict';
import { mountModeChoices } from '../app/game/ui/mode-choice.mjs';
import { prepareCoupaHeadArt, drawCoupaHead } from '../app/game/snake/coupa-art.mjs';

class Node {
  constructor(tag, document) {
    this.tagName = tag.toUpperCase(); this.ownerDocument = document;
    this.children = []; this.dataset = {}; this.attributes = new Map(); this.listeners = new Map();
    this.id = ''; this.style = { setProperty() {} }; this.classList = { add() {} };
  }
  append(node) { node.parentNode = this; this.children.push(node); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(name, fn) { this.listeners.set(name, fn); }
  removeEventListener(name, fn) { if (this.listeners.get(name) === fn) this.listeners.delete(name); }
  dispatchEvent(event) { this.dispatched = event; }
  remove() { this.parentNode.children = this.parentNode.children.filter(node => node !== this); }
}
function navigation() {
  const document = { createElement(tag) { return new Node(tag, document); },
    defaultView: { CustomEvent: class { constructor(type) { this.type = type; } } } };
  const root = new Node('nav', document); root.id = 'modes';
  const solo = new Node('a', document), team = new Node('a', document);
  solo.id = 'retained-solo'; solo.href = '/game/?edition=coupa-all';
  team.id = 'retained-team'; team.href = '/game/couch/relay-rescue.html?journey=coupa-all';
  return { root, solo, team };
}

test('mode presentation preserves checked departure anchors and exposes a static current mode', () => {
  const { root, solo, team } = navigation();
  const departure = () => {}; solo.onclick = departure;
  let pauses = 0;
  const owner = mountModeChoices({ root, current: 'versus', actions: { solo, team }, pause() { pauses++; } });
  assert.equal(root.children[0], solo);
  assert.equal(root.children[2], team);
  assert.equal(solo.onclick, departure, 'Do not replace the host departure owner');
  assert.equal(solo.href, '/game/?edition=coupa-all');
  assert.equal(team.href, '/game/couch/relay-rescue.html?journey=coupa-all');
  const current = root.children[1];
  assert.equal(current.tagName, 'SPAN');
  assert.equal(current.getAttribute('aria-current'), 'page');
  assert.equal(current.listeners.size, 0);
  assert.equal(root.dataset.menuScope, 'modes');
  assert.equal(current.dataset.gameMode, 'versus');
  assert.equal(root.dispatched.type, 'game-mode-choices-ready');
  solo.listeners.get('click')();
  assert.equal(pauses, 1);
  assert.deepEqual(root.children.map(node => node.textContent), ['Solo', 'Versus', 'Team', 'Snake', 'Collections']);
  owner.dispose();
  assert.deepEqual(root.children, [solo, team]);
  assert.equal(solo.listeners.size, 0);
});

test('Snake draws the retained Coupa logo image without changing its run', async () => {
  let image;
  class OriginalImage {
    constructor() { image = this; }
    set src(value) { this.url = value; queueMicrotask(() => this.onload()); }
  }
  await prepareCoupaHeadArt({ ImageClass: OriginalImage });
  assert.ok(image.url.endsWith('/game/editions/assets/coupa/flower-blue.png'));
  const calls = [];
  const ctx = new Proxy({}, { get(target, key) {
    return target[key] ?? ((...args) => calls.push([key, ...args]));
  } });
  const snake = { id: 0, body: [{ x: 4, y: 5 }], direction: 'right' };
  const before = structuredClone(snake);
  drawCoupaHead(ctx, snake, { edge: '#64d8f4' }, { timeMs: 100, reduced: true });
  const imageCall = calls.find(([name]) => name === 'drawImage');
  assert.equal(imageCall[1], image);
  assert.deepEqual(imageCall.slice(2), [-11, -11, 22, 22]);
  assert.deepEqual(snake, before);
});


import { blocksPlayInput } from '../app/game/ui/play-input.mjs';
test('direction controls work after Start while dialogs and text fields retain keyboard ownership', () => {
  const input = (tagName, key, options) => blocksPlayInput({target:{tagName},key}, options);
  assert.equal(input('BUTTON', 'ArrowUp'), false);
  assert.equal(input('BUTTON', 'w'), false);
  assert.equal(input('BUTTON', ' '), true, 'Space activates the focused button once');
  assert.equal(input('SELECT', 'ArrowDown'), true);
  assert.equal(input('INPUT', 'w'), true);
  assert.equal(input('CANVAS', 'ArrowRight', {blocked:true}), true);
  assert.equal(input('BODY', 'ArrowRight', {hidden:true}), true);
  assert.equal(blocksPlayInput({defaultPrevented:true,target:{tagName:'BODY'},key:'ArrowRight'}), true);
});
