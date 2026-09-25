import { test, expect } from '@playwright/test';

test('lobby, controls, settings, deployment and reload', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Headless browsers do not reliably support native pointer lock.
  await page.addInitScript(() => {
    let locked = null;
    Object.defineProperty(document, 'pointerLockElement', { get: () => locked });
    HTMLCanvasElement.prototype.requestPointerLock = function () {
      locked = this;
      document.dispatchEvent(new Event('pointerlockchange'));
      return Promise.resolve();
    };
    document.exitPointerLock = () => {
      locked = null;
      document.dispatchEvent(new Event('pointerlockchange'));
    };
  });
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('FREQUENCY');
  await page.locator('#controls-open').click();
  await expect(page.locator('#modal')).toBeVisible();
  await expect(page.locator('#modal-content')).toContainText('Aim down sights');
  await page.locator('#modal-close').click();
  await page.locator('#settings-open').click();
  await page.locator('#quality').selectOption('1');
  await page.locator('#modal-close').click();
  await page.locator('#deploy').click();
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#menu')).toBeHidden();
  await expect(page.locator('#round')).toHaveText('01', { timeout: 10000 });
  await page.mouse.click(640, 360);
  await expect(page.locator('#ammo')).toHaveText('11');
  await page.keyboard.press('r');
  await expect(page.locator('#ammo')).toHaveText('12', { timeout: 5000 });
  await expect(page.locator('#reserve')).toHaveText('119');
  await page.keyboard.press('Escape');
  await expect(page.locator('#pause')).toBeVisible();
  await page.locator('#quit').click();
  await expect(page.locator('#menu')).toBeVisible();
  expect(errors).toEqual([]);
});
