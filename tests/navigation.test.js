import { test } from "node:test";
import assert from "node:assert/strict";
import { Navigation } from "../src/navigation.js";
import { enemyType, mysteryWeapon, WEAPONS, PERKS } from "../src/game-rules.js";

function world(colliders) {
  const blocked = (x, z) =>
    Math.abs(x) > 23.8 ||
    Math.abs(z) > 23.8 ||
    colliders.some(
      (c) =>
        c.enabled !== false &&
        Math.abs(x - c.x) < c.w &&
        Math.abs(z - c.z) < c.d,
    );
  blocked.colliders = colliders;
  return blocked;
}
function follow(nav, start, goal) {
  nav.update(goal.x, goal.z);
  let p = { ...start };
  for (let i = 0; i < 4000; i++) {
    if (Math.hypot(p.x - goal.x, p.z - goal.z) < 0.3) return true;
    const target = nav.waypoint(p.x, p.z, goal.x, goal.z);
    if (!target) return false;
    const dx = target.x - p.x,
      dz = target.z - p.z,
      d = Math.hypot(dx, dz),
      step = Math.min(0.08, d);
    if (d < 0.00001) return false;
    const next = { x: p.x + (dx / d) * step, z: p.z + (dz / d) * step };
    assert.ok(
      nav.clear(p.x, p.z, next.x, next.z),
      "movement cannot cross geometry",
    );
    p = next;
  }
  return false;
}
test("routes around a container and a U-shaped dead end without wall sliding", () => {
  const nav = new Navigation(
    world([
      { x: 0, z: 0, w: 5, d: 1 },
      { x: -5, z: 3, w: 1, d: 4 },
      { x: 5, z: 3, w: 1, d: 4 },
    ]),
  );
  assert.ok(follow(nav, { x: 0, z: 4 }, { x: 0, z: -5 }));
});
test("locked rooms are excluded from spawns; opening a door connects them", () => {
  const door = { x: 0, z: 0, w: 2.1, d: 0.6, enabled: true };
  const nav = new Navigation(
    world([
      { x: -13, z: 0, w: 11.1, d: 0.6 },
      { x: 13, z: 0, w: 11.1, d: 0.6 },
      door,
    ]),
  );
  nav.update(0, 10);
  assert.equal(nav.distance[nav.index(0, -10)], -1);
  for (let i = 0; i < 1000; i++) {
    const p = nav.spawn(0, 10);
    assert.ok(p.z > 0);
    assert.ok(!nav.blocked(p.x, p.z));
  }
  door.enabled = false;
  nav.rebuild();
  nav.update(0, 10);
  assert.ok(nav.distance[nav.index(0, -10)] > 0);
  assert.ok(follow(nav, { x: 0, z: -10 }, { x: 0, z: 10 }));
});
test("spawns never jitter beyond arena bounds and always have a path", () => {
  const nav = new Navigation(
    world([
      { x: 18, z: 8, w: 1.95, d: 3.9 },
      { x: -14, z: 17, w: 1.73, d: 3.23 },
    ]),
  );
  nav.update(0, 11);
  for (let i = 0; i < 1000; i++) {
    const p = nav.spawn(0, 11);
    assert.ok(Math.abs(p.x) <= 23 && Math.abs(p.z) <= 23);
    assert.ok(!nav.blocked(p.x, p.z));
    assert.ok(nav.distance[nav.index(p.x, p.z)] >= 0);
  }
});
test("thin obstacles between grid cells cannot create invalid BFS edges", () => {
  const nav = new Navigation(world([{ x: 0.5, z: 0, w: 0.1, d: 10 }]));
  nav.update(4, 0);
  assert.ok(!nav.edges[nav.index(0, 0)].includes(nav.index(1, 0)));
  assert.ok(follow(nav, { x: 0, z: 0 }, { x: 4, z: 0 }));
});
test("enemy progression and mystery results are valid and do not repeat the held weapon", () => {
  for (let i = 0; i < 100; i++)
    assert.equal(
      enemyType(1, () => i / 100),
      "walker",
    );
  assert.equal(
    enemyType(2, () => 0.4),
    "runner",
  );
  assert.equal(
    enemyType(3, () => 0.2),
    "spitter",
  );
  assert.equal(
    enemyType(4, () => 0.1),
    "brute",
  );
  for (const id of Object.keys(WEAPONS))
    for (let i = 0; i < 100; i++) {
      const result = mysteryWeapon(id, () => i / 100);
      assert.notEqual(result, id);
      assert.ok(WEAPONS[result]);
    }
  assert.equal(Object.keys(PERKS).length, 4);
});
