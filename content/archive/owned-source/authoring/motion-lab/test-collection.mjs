import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateCollection, validateResult, validateScope, scopeKey, createProfile, applyResult, applyFixture, evaluateCollection, equipCharacter, resolveCharacter, restoreProfile, serializeProfile} from "./collection.mjs";

const definitions = JSON.parse(readFileSync(new URL("./collection-presets.json", import.meta.url), "utf8"));
const context = id => definitions.contexts.find(entry => entry.id === id).scope;
const fpv = context("fpv-first-flight");
const row = (profile, id, current = fpv, defs = definitions) => evaluateCollection(defs, profile, current).find(entry => entry.id === id);
const fixture = id => structuredClone(definitions.fixtures.find(entry => entry.id === id).event);
const withFixtures = (...ids) => ids.reduce((profile, id) => {
  const result = applyFixture(definitions, profile, id); assert.equal(result.accepted, true, result.reason); return result.profile;
}, createProfile());
const freshRun = (event, suffix) => ({...structuredClone(event), id: `event-${suffix}`, runId: `run-${suffix}`});
const apply = (profile, event) => {const result = applyResult(profile, event); assert.equal(result.accepted, true, result.reason); return result.profile;};
const equip = (profile, id, scope, current = fpv) => {const result = equipCharacter(definitions, profile, id, scope, current); assert.equal(result.accepted, true, result.reason); return result.profile;};

test("authored collection validates against its visual IDs without permitting stats", () => {
  const ids = definitions.characters.map(character => character.id);
  assert.equal(validateCollection(definitions, ids), definitions);
  assert.throws(() => validateCollection(definitions, ids.filter(id => id !== "fpv-night")), /missing visual character/);
  const bad = structuredClone(definitions); bad.characters[1].speed = 20;
  assert.throws(() => validateCollection(bad), /speed is unsupported/);
});

test("each family starts with an eligible default and unknown contexts use neutral", () => {
  const profile = createProfile();
  for (const [scope, expected] of [[context("fpv-first-flight"), "fpv-body"], [context("atlas-heritage"), "ukrainian-bird"], [context("retro-first"), "retro-craft"], [context("navi-spend-review"), "navi-avatar"]]) {
    const resolved = resolveCharacter(definitions, profile, scope);
    assert.equal(resolved.characterId, expected); assert.equal(resolved.source, "default");
  }
  assert.deepEqual(resolveCharacter(definitions, profile, {}).characterId, "neutral-marker");
  assert.equal(resolveCharacter(definitions, profile, {themeId: "new-theme"}).source, "fallback");
});

test("locked cards expose unmet alternatives; availability and ownership are distinct", () => {
  const profile = createProfile();
  const night = row(profile, "fpv-night");
  assert.equal(night.available, true); assert.equal(night.unlocked, false); assert.equal(night.unmet.length, 2);
  assert.match(night.unmet[0], /0\/1/); assert.match(night.unmet[1], /0\/3/);
  const bird = row(profile, "ukrainian-bird");
  assert.equal(bird.unlocked, true); assert.equal(bird.available, false); assert.equal(bird.status, "unavailable");
});

test("complete simulated results change only a new profile; all fixtures earn variants without auto-equipping", () => {
  const empty = createProfile(); const snapshot = structuredClone(empty);
  const first = applyFixture(definitions, empty, "fpv-first-clear");
  assert.equal(first.accepted, true); assert.deepEqual(empty, snapshot); assert.equal(empty.events.length, 0);
  assert.equal(row(first.profile, "fpv-racer").unlocked, true);
  assert.equal(resolveCharacter(definitions, first.profile, fpv).characterId, "fpv-body");
  const all = withFixtures(...definitions.fixtures.map(entry => entry.id));
  assert.equal(evaluateCollection(definitions, all, fpv).filter(entry => !entry.unlocked).length, 0);
  assert.equal(all.equipped.length, 0);
});

test("same event is idempotent and conflicting event or run IDs cannot rewrite a reward", () => {
  const event = fixture("fpv-first-clear"), profile = apply(createProfile(), event);
  assert.equal(applyResult(profile, event).reason, "duplicate-event");
  assert.equal(applyResult(profile, {...event, result: {...event.result, stars: 3}}).reason, "event-id-conflict");
  assert.equal(applyResult(profile, {...event, id: "new-event-id"}).reason, "duplicate-run");
  assert.equal(applyResult(profile, {...event, id: "new-event-id", result: {...event.result, stars: 3}}).reason, "run-id-conflict");
  assert.equal(profile.events.length, 1);
});

test("event identity ignores object property order and objective-set order", () => {
  const event = fixture("fpv-clean-map"); event.result.objectives.push("extra-objective");
  const profile = apply(createProfile(), event);
  const reordered = {...event, context: Object.fromEntries(Object.entries(event.context).reverse()), result: {...event.result, objectives: [...event.result.objectives].reverse()}};
  assert.equal(applyResult(profile, reordered).reason, "duplicate-event");
});

test("replays and challenge/map variants of the same level never inflate level counts", () => {
  let profile = withFixtures("fpv-first-clear");
  for (let index = 0; index < 4; index++) {
    const event = freshRun(fixture("fpv-first-clear"), `replay-${index}`);
    event.context.mapId = `alternate-${index}`; event.context.challengeId = `variant-${index}`;
    profile = apply(profile, event);
  }
  const night = row(profile, "fpv-night");
  assert.equal(night.unlocked, false); assert.equal(night.conditions.find(entry => entry.id === "three-fpv-levels").current, 1);
});

test("star totals use the best qualifying result of each distinct level", () => {
  let profile = withFixtures("retro-first-clear");
  let replay = freshRun(fixture("retro-first-clear"), "retro-replay"); replay.result.stars = 3;
  profile = apply(profile, replay);
  assert.equal(row(profile, "retro-vector", context("retro-first")).conditions[0].current, 3);
  replay = freshRun(fixture("retro-first-clear"), "retro-worse"); replay.result.stars = 1;
  profile = apply(profile, replay);
  assert.equal(row(profile, "retro-vector", context("retro-first")).conditions[0].current, 3);
  profile = apply(profile, fixture("retro-second-clear"));
  assert.equal(row(profile, "retro-vector", context("retro-first")).unlocked, true);
});

test("wrong map, missing objective, life loss and a lost run cannot satisfy a clean-map unlock", () => {
  for (const change of [event => {event.context.mapId = "wrong-map";}, event => {event.result.objectives = [];}, event => {event.result.livesLost = 1;}, event => {event.result.outcome = "lost"; event.result.stars = 0;}]) {
    const event = fixture("fpv-clean-map"); change(event);
    const profile = apply(createProfile(), event);
    assert.equal(row(profile, "fpv-night").unlocked, false);
  }
  assert.equal(row(withFixtures("fpv-clean-map"), "fpv-night").unlocked, true);
});

test("distinct-level alternative works without a perfect run or daily grind", () => {
  let profile = createProfile();
  for (let index = 0; index < 3; index++) {
    const event = freshRun(fixture("fpv-first-clear"), `accessible-${index}`);
    event.context.levelId = `other-level-${index}`; event.result.livesLost = 2; event.result.stars = 1;
    profile = apply(profile, event);
  }
  const night = row(profile, "fpv-night");
  assert.equal(night.unlocked, true); assert.deepEqual(night.unmet, []);
});

test("AND groups and duration/star predicates require all conditions, while OR remains alternative", () => {
  const defs = structuredClone(definitions);
  const racer = defs.characters.find(entry => entry.id === "fpv-racer");
  racer.unlock = {anyOf: [{allOf: [
    {id: "timely", label: "Fast complete", type: "completed-levels", scope: {themeId: "fpv-front"}, target: 1, maxDurationMs: 60000, minStars: 3},
    {id: "two-levels", label: "Two distinct levels", type: "completed-levels", scope: {themeId: "fpv-front"}, target: 2}
  ]}]};
  const first = fixture("fpv-first-clear"); first.result.durationMs = 50000; first.result.stars = 3;
  let profile = apply(createProfile(), first);
  assert.equal(row(profile, "fpv-racer", fpv, defs).unlocked, false);
  profile = apply(profile, fixture("fpv-clean-map"));
  assert.equal(row(profile, "fpv-racer", fpv, defs).unlocked, true);
});

test("equipping rejects locked, wrong-theme and mismatched scope choices", () => {
  const profile = createProfile();
  assert.equal(equipCharacter(definitions, profile, "fpv-racer", {}, fpv).reason, "character-locked");
  assert.equal(equipCharacter(definitions, profile, "ukrainian-bird", {}, fpv).reason, "character-unavailable-in-context");
  assert.equal(equipCharacter(definitions, profile, "fpv-body", {themeId: "retro-1994"}, fpv).reason, "scope-does-not-match-current-context");
  assert.equal(equipCharacter(definitions, profile, "unknown", {}, fpv).reason, "unknown-character");
});

test("scope resolution is deterministic: more constraints, then map/level/challenge/case/theme/game", () => {
  let profile = withFixtures("fpv-first-clear", "fpv-clean-map");
  profile = equip(profile, "fpv-body", {});
  profile = equip(profile, "fpv-racer", {gameId: fpv.gameId});
  profile = equip(profile, "fpv-night", {themeId: fpv.themeId});
  assert.equal(resolveCharacter(definitions, profile, fpv).characterId, "fpv-night");
  profile = equip(profile, "fpv-racer", {caseId: fpv.caseId});
  assert.equal(resolveCharacter(definitions, profile, fpv).characterId, "fpv-racer");
  profile = equip(profile, "fpv-night", {challengeId: fpv.challengeId});
  profile = equip(profile, "fpv-racer", {levelId: fpv.levelId});
  profile = equip(profile, "fpv-night", {mapId: fpv.mapId});
  assert.equal(resolveCharacter(definitions, profile, fpv).characterId, "fpv-night");
  profile = equip(profile, "fpv-racer", {gameId: fpv.gameId, themeId: fpv.themeId});
  assert.equal(resolveCharacter(definitions, profile, fpv).characterId, "fpv-racer");
  profile = equip(profile, "fpv-night", fpv);
  assert.deepEqual(resolveCharacter(definitions, profile, fpv).scope, fpv);
  profile.equipped.reverse();
  assert.equal(resolveCharacter(definitions, profile, fpv).characterId, "fpv-night");
  assert.equal(resolveCharacter(definitions, profile, context("atlas-heritage")).characterId, "ukrainian-bird");
});

test("removed or locked saved choices fall through safely; unequippable defaults do too", () => {
  const profile = createProfile();
  profile.equipped = [{scope: {}, characterId: "removed-character"}, {scope: {themeId: fpv.themeId}, characterId: "fpv-night"}];
  assert.equal(resolveCharacter(definitions, profile, fpv).characterId, "fpv-body");
  const defs = structuredClone(definitions); defs.defaults.find(entry => entry.characterId === "fpv-body").characterId = "fpv-night";
  assert.equal(resolveCharacter(defs, profile, fpv).characterId, "neutral-marker");
});

test("lab and future game profiles cannot mix reward modes; fixtures never enter game mode", () => {
  const event = fixture("fpv-first-clear"), game = createProfile({mode: "game", profileId: "future-game"});
  assert.equal(applyResult(game, event).reason, "profile-mode-mismatch");
  assert.equal(applyFixture(definitions, game, "fpv-first-clear").reason, "fixtures-are-lab-only");
  assert.equal(applyResult(createProfile(), {...event, simulated: false}).reason, "profile-mode-mismatch");
  assert.equal(applyResult(game, {...event, simulated: false}).accepted, true);
});

test("valid save round-trips; corruption, foreign identity and unknown versions recover visibly", () => {
  const profile = equip(withFixtures("fpv-first-clear"), "fpv-racer", {themeId: "fpv-front"});
  const text = serializeProfile(profile);
  assert.deepEqual(restoreProfile(text), {profile, warning: null});
  const badSaves = ["{", JSON.stringify({...profile, version: "9.0.0"}), JSON.stringify({...profile, mode: "game"}), JSON.stringify({...profile, profileId: "someone-else"}), JSON.stringify({...profile, events: [profile.events[0], profile.events[0]]}), JSON.stringify({...profile, mode: undefined}), JSON.stringify({...profile, profileId: undefined})];
  for (const saved of badSaves) {
    const restored = restoreProfile(saved);
    assert.equal(restored.profile.events.length, 0); assert.match(restored.warning, /not loaded/);
  }
  assert.equal(restoreProfile(null).warning, null);
});

test("malformed conditions, fallback, scopes and incomplete result events fail closed", () => {
  assert.throws(() => validateScope({theme: "fpv-front"}), /unsupported/);
  assert.equal(scopeKey({themeId: "fpv-front", gameId: "reveal-lab"}), scopeKey({gameId: "reveal-lab", themeId: "fpv-front"}));
  const event = fixture("fpv-first-clear"); delete event.result.durationMs;
  assert.throws(() => validateResult(event), /durationMs/);
  const defs = structuredClone(definitions); defs.fallbackId = "fpv-night";
  assert.throws(() => validateCollection(defs), /globally available starter/);
  const paid = structuredClone(definitions); paid.characters.find(entry => entry.id === "fpv-racer").unlock.anyOf[0].allOf[0].type = "purchase";
  assert.throws(() => validateCollection(paid), /unsupported criterion/);
  const impossibleCount = structuredClone(definitions); impossibleCount.characters.find(entry => entry.id === "fpv-racer").unlock.anyOf[0].allOf[0].target = 2001;
  assert.throws(() => validateCollection(impossibleCount), /target/);
  for (const invalid of [null, undefined, {}, {...createProfile(), events: "invalid"}]) {
    const rejected = applyFixture(definitions, invalid, "fpv-first-clear");
    assert.equal(rejected.accepted, false); assert.match(rejected.reason, /Collection:/);
  }
});

test("result arrival order does not change derived ownership or best totals", () => {
  const events = definitions.fixtures.map(entry => entry.event);
  const a = events.reduce(apply, createProfile());
  const b = [...events].reverse().reduce(apply, createProfile());
  assert.deepEqual(evaluateCollection(definitions, a, fpv), evaluateCollection(definitions, b, fpv));
});
