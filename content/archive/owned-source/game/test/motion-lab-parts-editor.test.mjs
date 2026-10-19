import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Document } from './helpers/couch-dom.mjs';
import { freezeMotionPresets } from '../../authoring/motion-lab/copy.mjs';
import { advanceAnimation, createAnimationState } from '../../authoring/motion-lab/animation.mjs';
import { paintCharacter } from '../../authoring/motion-lab/render-character.mjs';
import {
  attachmentComponents,
  validateAttachments,
  attachmentJSON,
  createAttachmentDraft,
  readAttachmentDraft,
  editAttachment,
  createPartsEditor,
} from '../../authoring/motion-lab/parts-editor.mjs';

const presets = freezeMotionPresets(
  JSON.parse(
    readFileSync(new URL('../../authoring/motion-lab/presets.json', import.meta.url), 'utf8'),
  ),
);

test('all historical attachment fragments round-trip without changing source recipes or rotor components', () => {
  const before = JSON.stringify(presets);
  for (const [id, recipe] of Object.entries(presets.animationRecipes)) {
    const parts = attachmentComponents(recipe),
      draft = createAttachmentDraft(id, recipe),
      json = attachmentJSON(parts, recipe),
      restored = readAttachmentDraft(draft, json, id, recipe);
    assert.deepEqual(restored, parts);
    assert.notEqual(restored, parts);
  }
  assert.equal(JSON.stringify(presets), before);
});

test('attachment edits use historical bounds and preserve wing side and unrelated parts', () => {
  for (const name of ['swallow-flight', 'retro-thruster', 'helper-guidance']) {
    const recipe = presets.animationRecipes[name],
      edited = editAttachment(recipe, 0, { anchor: 0, x: -1, y: 1, rate: 0.1 });
    assert.deepEqual(edited[0].anchors[0], [-1, 1, ...recipe.components[0].anchors[0].slice(2)]);
    assert.deepEqual(edited.slice(1), recipe.components.slice(1));
    for (const patch of [{ x: -1.01 }, { y: 1.01 }, { x: NaN }, { rate: Infinity }, { rate: 0.09 }])
      assert.throws(() => editAttachment(recipe, 0, patch), /invalid/);
    const max = name === 'swallow-flight' ? 5 : name === 'retro-thruster' ? 12 : 2;
    assert.doesNotThrow(() => editAttachment(recipe, 0, { rate: max }));
    assert.throws(() => editAttachment(recipe, 0, { rate: max + 0.01 }), /invalid/);
  }
  assert.throws(
    () => editAttachment(presets.animationRecipes['helper-guidance'], 9, { x: 0 }),
    /invalid/,
  );
});

test('unknown fields, invented states and changed component identities reject before acceptance', () => {
  const recipe = presets.animationRecipes['helper-guidance'],
    parts = attachmentComponents(recipe),
    mutate = (change) => {
      const value = structuredClone(parts);
      change(value);
      return value;
    };
  for (const value of [
    null,
    {},
    [],
    [...parts, parts[0]],
    [...parts].reverse(),
    mutate((v) => {
      v[0].id = 'new';
    }),
    mutate((v) => {
      v[0].type = 'stun';
    }),
    mutate((v) => {
      v[0].downed = true;
    }),
    mutate((v) => {
      v[0].anchors = [[0, 0, 1, 0]];
    }),
    mutate((v) => {
      v[0].anchors = Array.from({ length: 9 }, () => [0, 0]);
    }),
    mutate((v) => {
      v[0].anchors = [[0, '0']];
    }),
    mutate((v) => {
      v[0].color = 'red';
    }),
    mutate((v) => {
      v[1].dutyCycle = 1;
    }),
  ])
    assert.throws(() => validateAttachments(value, recipe), /invalid/);
  const draft = createAttachmentDraft('helper', recipe);
  for (const raw of ['{bad', ' '.repeat(16385), '[{"__proto__":{}}]'])
    assert.throws(() => readAttachmentDraft(draft, raw, 'helper', recipe), /invalid/);
  assert.throws(() => readAttachmentDraft(draft, '[]', 'other', recipe), /stale/);
  const changed = { ...recipe, components: editAttachment(recipe, 0, { rate: 1.2 }) };
  assert.throws(
    () => readAttachmentDraft(draft, JSON.stringify(parts), 'helper', changed),
    /stale/,
  );
});

test('mounted attachment controls preserve dirty JSON, reject stale selection and export only accepted fragments', () => {
  const doc = new Document(),
    elements = Object.fromEntries(
      [
        'root',
        'component',
        'anchor',
        'x',
        'y',
        'rate',
        'limits',
        'json',
        'apply',
        'reset',
        'export',
        'status',
      ].map((key) => [
        key,
        doc.createElement(['component', 'anchor'].includes(key) ? 'select' : 'input'),
      ]),
    );
  let selection = { id: 'helper', recipe: presets.animationRecipes['helper-guidance'] },
    accepted = 0;
  const downloads = [],
    listeners = [],
    editor = createPartsEditor({
      elements,
      getSelection: () => selection,
      apply(parts) {
        accepted++;
        selection = {
          ...selection,
          recipe: parts
            ? { ...selection.recipe, components: parts }
            : presets.animationRecipes['helper-guidance'],
        };
      },
      listen(node, type, handler) {
        node.addEventListener(type, handler);
        listeners.push(() => node.removeEventListener(type, handler));
      },
      text: (key) => key,
      componentName: (type) => type,
      download: (...args) => downloads.push(args),
    });
  editor.refresh();
  const initial = elements.json.value;
  elements.json.value = '{pending';
  editor.refresh();
  assert.equal(elements.json.value, '{pending', 'Cosmetic/locale refresh preserves pending text');
  elements.apply.click();
  assert.equal(elements.status.textContent, 'invalid');
  assert.equal(accepted, 0);
  elements.export.click();
  assert.deepEqual(downloads[0], [initial, 'helper.attachments.json']);
  assert.equal(elements.json.value, '{pending');
  selection = { id: 'other', recipe: presets.animationRecipes['helper-guidance'] };
  elements.json.value = initial;
  elements.apply.click();
  assert.equal(elements.status.textContent, 'stale');
  assert.equal(accepted, 0);
  editor.refresh();
  elements.component.value = '1';
  elements.component.emit('change');
  elements.anchor.value = '1';
  elements.anchor.emit('change');
  elements.x.value = '0.25';
  elements.x.emit('change');
  assert.equal(accepted, 1);
  assert.equal(elements.component.value, '1');
  assert.equal(elements.anchor.value, '1');
  assert.equal(selection.recipe.components[1].anchors[1][0], 0.25);
  const retained = JSON.stringify(selection.recipe);
  elements.rate.value = '100';
  elements.rate.emit('change');
  assert.equal(elements.status.textContent, 'invalid');
  assert.equal(JSON.stringify(selection.recipe), retained);
  listeners.forEach((remove) => remove());
  elements.reset.click();
  assert.equal(JSON.stringify(selection.recipe), retained, 'Disposed host listeners cannot apply');
});

test('actual attachment paint uses edited origins and paused/reduced animation poses without changing clocks', () => {
  const recipe = presets.animationRecipes['swallow-flight'],
    animation = advanceAnimation(
      createAnimationState(),
      recipe,
      { visualSpeed: 1, cruiseSpeed: 1 },
      0.1,
    ),
    edited = { ...recipe, components: editAttachment(recipe, 0, { x: 0.4, y: 0.2, rate: 3 }) },
    body = { widthCells: 2, heightCells: 2, headingOffsetDegrees: 0, rotors: [] },
    image = { width: 160, height: 80 },
    before = structuredClone(animation);
  const travel = { visualSpeed: 1, cruiseSpeed: 1 };
  assert.notDeepEqual(
    advanceAnimation(animation, edited, travel, 0.1).phases,
    advanceAnimation(animation, recipe, travel, 0.1).phases,
    'The accepted base rate changes subsequent playback through the existing phase integrator',
  );
  const paint = (value, reducedMotion) => {
    const calls = [],
      ctx = new Proxy(
        {},
        {
          get:
            (_, key) =>
            (...args) =>
              calls.push([key, ...args]),
          set: () => true,
        },
      );
    paintCharacter(ctx, {
      body,
      image,
      recipe: value,
      animation,
      colors: { body: '#ffffff' },
      reducedMotion,
    });
    return calls;
  };
  for (const reduced of [false, true]) {
    assert.deepEqual(
      advanceAnimation(animation, edited, { visualSpeed: 1, cruiseSpeed: 1 }, 1, {
        paused: !reduced,
        reducedMotion: reduced,
      }),
      animation,
    );
    const sourceCalls = paint(recipe, reduced),
      editedCalls = paint(edited, reduced);
    assert.notDeepEqual(editedCalls, sourceCalls);
    assert.ok(
      editedCalls.some((call) => call[0] === 'translate' && call[1] === 0.8 && call[2] === 0.2),
    );
    const wingAngles = editedCalls.filter((call) => call[0] === 'rotate').slice(1);
    assert.equal(wingAngles.length, 2);
    if (reduced) assert.ok(wingAngles.every((call) => call[1] === 0));
    else assert.ok(wingAngles.every((call) => call[1] !== 0));
    assert.deepEqual(
      paint(recipe, reduced),
      sourceCalls,
      'Source restore yields the same paused pose',
    );
  }
  assert.deepEqual(animation, before);
});
