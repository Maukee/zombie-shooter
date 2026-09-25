import { test, expect } from "@playwright/test";

async function lowQuality(page) {
  await expect(page.locator("#deploy")).toBeEnabled();
  await page.locator("#settings-open").click();
  await page.locator("#quality").selectOption("1");
  await page.locator("#modal-close").click();
}
const state = (page) => page.evaluate(() => window.__gameState());

test("real mouse capture: movement, aiming, elimination, reload, pause and resume", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await lowQuality(page);
  await page.locator("#controls-open").click();
  await expect(page.locator("#modal-content")).toContainText("Aim down sights");
  await page.locator("#modal-close").click();
  await page.locator("#deploy").click();
  await expect(page.locator("#hud")).toBeVisible();
  await expect(page.locator("#round")).toHaveText("01");
  await expect.poll(async () => (await state(page)).locked).toBe(true);
  expect((await state(page)).pitch).toBe(0);
  const start = await state(page);
  await page.keyboard.down("w");
  await expect
    .poll(async () => (await state(page)).position[2])
    .toBeLessThan(start.position[2] - 0.2);
  await page.keyboard.up("w");
  await page.mouse.down();
  await page.mouse.up();
  await expect(page.locator("#ammo")).toHaveText("11");
  await expect(page.locator("#kills")).toHaveText("1");
  await page.keyboard.press("r");
  await expect(page.locator("#ammo")).toHaveText("12");
  await expect(page.locator("#reserve")).toHaveText("119");
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause")).toBeVisible();
  const paused = await state(page);
  await page.waitForTimeout(300);
  expect((await state(page)).gameTime).toBe(paused.gameTime);
  await page.locator("#resume").click();
  await expect(page.locator("#pause")).toBeHidden();
  await expect.poll(async () => (await state(page)).locked).toBe(true);
  await page.keyboard.press("Escape");
  await page.locator("#quit").click();
  await expect(page.locator("#menu")).toBeVisible();
  expect(errors).toEqual([]);
});

test("rejected capture still allows starting, moving, shooting and resuming", async ({
  page,
}) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.requestPointerLock = () =>
      Promise.reject(
        new DOMException("Preview policy blocks capture", "SecurityError"),
      );
  });
  await page.goto("/");
  await lowQuality(page);
  await page.locator("#deploy").click();
  await expect(page.locator("#input-status")).toBeVisible();
  expect((await state(page)).mode).toBe("playing");
  const start = await state(page);
  await page.keyboard.down("d");
  await expect
    .poll(async () => (await state(page)).position[0])
    .toBeGreaterThan(start.position[0]);
  await page.keyboard.up("d");
  await page.mouse.move(480, 320);
  await page.mouse.move(520, 330);
  await expect.poll(async () => (await state(page)).yaw).toBeLessThan(0);
  await page.mouse.click(520, 330);
  await expect(page.locator("#ammo")).toHaveText("11");
  await page.keyboard.press("Escape");
  await expect(page.locator("#pause")).toBeVisible();
  await page.locator("#resume").click();
  await expect(page.locator("#pause")).toBeHidden();
  expect((await state(page)).mode).toBe("playing");
  await expect(page.locator("#input-status")).toBeVisible();
});

test("actual sandboxed iframe without allow-pointer-lock remains playable", async ({
  page,
}) => {
  await page.route("**/embedded-test", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<html><body style="margin:0"><iframe title="Game" src="/" sandbox="allow-scripts allow-same-origin" style="width:100vw;height:100vh;border:0"></iframe></body></html>',
    }),
  );
  await page.goto("/embedded-test");
  const frame = page.frameLocator("iframe");
  await lowQuality(frame);
  await frame.locator("#deploy").click();
  await expect(frame.locator("#input-status")).toBeVisible();
  await expect(frame.locator("#pause")).toBeHidden();
  await expect(frame.locator("#round")).toHaveText("01");
  await page.mouse.click(480, 320);
  await expect(frame.locator("#ammo")).toHaveText("11");
  await page.keyboard.press("Escape");
  await expect(frame.locator("#pause")).toBeVisible();
  await frame.locator("#resume").click();
  await expect(frame.locator("#pause")).toBeHidden();
});

test("fonts are local and menu fits a compact desktop window", async ({
  page,
}) => {
  await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
  await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("#deploy")).toBeEnabled();
  await page.evaluate(() => document.fonts.ready);
  expect(
    await page.evaluate(() =>
      document.fonts.check('800 32px "Barlow Condensed"'),
    ),
  ).toBe(true);
  for (const selector of [
    "h1",
    "#deploy",
    "#controls-open",
    "#settings-open",
    ".menu-bottom",
  ]) {
    const box = await page.locator(selector).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(960);
    expect(box.y + box.height).toBeLessThanOrEqual(640);
  }
});
