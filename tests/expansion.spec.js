import { test, expect } from "@playwright/test";
const state = (page) => page.evaluate(() => window.__gameState());
async function start(page) {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.requestPointerLock = () =>
      Promise.reject(new DOMException("Test preview", "SecurityError"));
  });
  await page.goto("/?test");
  await expect(page.locator("#deploy")).toBeEnabled();
  await page.locator("#settings-open").click();
  await page.locator("#quality").selectOption("1");
  await page.locator("#modal-close").click();
  await page.locator("#deploy").click();
}
async function at(page, x, z) {
  await page.evaluate(([x, z]) => window.__gameTest.teleport(x, z), [x, z]);
}

test("doors, mystery box, perks and restart form a working purchase loop", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await at(page, 6, -17.4);
  await page.keyboard.press("e");
  expect((await state(page)).doors[0].open).toBe(false);
  expect((await state(page)).score).toBe(0);
  await page.evaluate(() => {
    window.__gameTest.grant(5000);
    window.__gameTest.resetEnemies();
  });
  await page.keyboard.press("e");
  expect((await state(page)).doors[0].open).toBe(true);
  expect((await state(page)).score).toBe(4500);
  await page.keyboard.press("e");
  expect((await state(page)).score).toBe(4500);
  // Walk across the threshold rather than merely teleporting into an unlocked room.
  await page.keyboard.down("w");
  await expect
    .poll(async () => (await state(page)).position[2])
    .toBeLessThan(-19.3);
  await page.keyboard.up("w");
  await at(page, 1, -20.8);
  await page.keyboard.press("e");
  expect((await state(page)).mystery.state).toBe("rolling");
  expect((await state(page)).score).toBe(3850);
  await page.keyboard.press("e");
  expect((await state(page)).score).toBe(3850);
  await page.evaluate(() => window.__gameTest.tick(2.5));
  const result = (await state(page)).mystery.result;
  expect((await state(page)).mystery.state).toBe("ready");
  await page.keyboard.press("e");
  expect((await state(page)).weaponId).toBe(result);
  expect((await state(page)).mystery.state).toBe("idle");
  await at(page, 11, -21.2);
  await page.keyboard.press("e");
  expect((await state(page)).perks).toContain("quick");
  const paid = (await state(page)).score;
  await page.keyboard.press("e");
  expect((await state(page)).score).toBe(paid);
  await at(page, -18.5, -11.8);
  await page.keyboard.press("e");
  expect((await state(page)).doors[1].open).toBe(true);
  await at(page, -22, -20.2);
  await page.keyboard.press("e");
  expect((await state(page)).maxHealth).toBe(200);
  expect((await state(page)).health).toBe(200);
  await at(page, -15, -20.2);
  await page.keyboard.press("e");
  expect((await state(page)).perks).toContain("rush");
  await at(page, -22, -14.7);
  await page.keyboard.press("e");
  expect((await state(page)).perks).toContain("recovery");
  expect((await state(page)).perks).toHaveLength(4);
  await page.keyboard.press("Escape");
  await page.locator("#quit").click();
  await page.locator("#deploy").click();
  const restarted = await state(page);
  expect(restarted.perks).toEqual([]);
  expect(restarted.maxHealth).toBe(100);
  expect(restarted.weaponId).toBe("pistol");
  expect(restarted.doors.every((d) => !d.open)).toBe(true);
  expect(restarted.mystery.state).toBe("idle");
  expect(errors).toEqual([]);
});

test("validated spawns, obstacle routing and trapped-enemy recovery prevent orphan waves", async ({
  page,
}) => {
  await start(page);
  const spawns = await page.evaluate(() => window.__gameTest.testSpawns(1000));
  expect(
    spawns.every(
      (p) =>
        !p.blocked && p.reachable && Math.abs(p.x) <= 23 && Math.abs(p.z) <= 23,
    ),
  ).toBe(true);
  expect(spawns.some((p) => p.x > -2 && p.x < 14 && p.z < -19)).toBe(false);
  await page.evaluate(() => {
    window.__gameTest.resetEnemies();
    window.__gameTest.spawn(-14, -6);
    window.__gameTest.advanceEnemies(5);
  });
  let snapshot = await state(page);
  expect(snapshot.recoveredEnemies).toBe(1);
  expect(snapshot.enemies).toHaveLength(1);
  expect(snapshot.enemies[0].blocked).toBe(false);
  expect(snapshot.kills).toBe(0);
  // Behind the truck: the old greedy wall slide could remain here indefinitely.
  await page.evaluate(() => {
    window.__gameTest.resetEnemies();
    window.__gameTest.spawn(-14, 22);
    for (let i = 0; i < 1100; i++) {
      window.__gameTest.advanceEnemies(1);
      const s = window.__gameState(),
        e = s.enemies[0];
      if (Math.hypot(e.x - s.position[0], e.z - s.position[2]) < 2) break;
    }
  });
  snapshot = await state(page);
  const enemy = snapshot.enemies[0];
  expect(
    Math.hypot(enemy.x - snapshot.position[0], enemy.z - snapshot.position[2]),
  ).toBeLessThan(2);
  expect(snapshot.recoveredEnemies).toBe(1);
  await page.evaluate(() => window.__gameTest.clearWave());
  await expect
    .poll(async () => (await state(page)).intermission)
    .toBeGreaterThan(0);
  await expect(page.locator("#wave-state")).toContainText("RESUPPLY");
  expect((await state(page)).remaining).toBe(0);
});

test("an expired mystery reward resets the box without a second charge", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    window.__gameTest.resetEnemies();
    window.__gameTest.grant(2000);
  });
  await at(page, 6, -17.4);
  await page.keyboard.press("e");
  await at(page, 1, -20.8);
  await page.keyboard.press("e");
  await page.evaluate(() => window.__gameTest.tick(18));
  const snapshot = await state(page);
  expect(snapshot.mystery.state).toBe("idle");
  expect(snapshot.weaponId).toBe("pistol");
  expect(snapshot.score).toBe(850);
});

test("enemy variants have distinct health, speed and working acid damage", async ({
  page,
}) => {
  await start(page);
  await page.evaluate(() => {
    window.__gameTest.resetEnemies();
    window.__gameTest.spawn(-5, 0, "walker");
    window.__gameTest.spawn(5, 0, "runner");
    window.__gameTest.spawn(0, -10, "brute");
    window.__gameTest.advanceEnemies(10);
  });
  let snapshot = await state(page);
  const walker = snapshot.enemies.find((e) => e.type === "walker"),
    runner = snapshot.enemies.find((e) => e.type === "runner"),
    brute = snapshot.enemies.find((e) => e.type === "brute");
  expect(brute.hp).toBeGreaterThan(walker.hp * 3);
  expect(runner.hp).toBeLessThan(walker.hp);
  expect(Math.hypot(runner.x - 5, runner.z)).toBeGreaterThan(
    Math.hypot(walker.x + 5, walker.z) * 1.6,
  );
  await page.evaluate(() => {
    window.__gameTest.resetEnemies();
    window.__gameTest.spawn(0, 0, "spitter");
    window.__gameTest.advanceEnemies(45);
  });
  expect((await state(page)).projectiles).toBeGreaterThan(0);
  await page.evaluate(() => window.__gameTest.tick(2));
  expect((await state(page)).health).toBe(86);
});
