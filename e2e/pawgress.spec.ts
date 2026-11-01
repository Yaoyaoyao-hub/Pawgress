import { expect, test } from '@playwright/test';

test('judge can finish the complete demo ritual route', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Meet your buddy' }).click();
  await page.getByRole('button', { name: /Hatch My Pet/ }).click();
  await page.getByRole('button', { name: /Use instant demo/ }).click();

  const repButton = page.getByRole('button', { name: 'Complete a demo rep' });
  for (let rep = 0; rep < 3; rep += 1) {
    await expect(repButton).toBeEnabled();
    await repButton.click();
    if (rep < 2) await expect(repButton).toBeEnabled({ timeout: 2500 });
  }

  await expect(page.getByRole('heading', { name: 'The little world is glowing!' })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Simulated data').first()).toBeVisible();
  await expect(page.getByText(/Today · \d+s/)).toBeVisible();
});

test('named scenes expose deterministic state for inspection', async ({ page }) => {
  await page.goto('/?scene=target-hold');
  await expect.poll(() => page.evaluate(() => Boolean((window as typeof window & { __PAWGRESS__?: unknown }).__PAWGRESS__))).toBe(true);
  await expect(page.getByRole('heading', { name: 'Reach, lower, deliver!' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const bridge = (window as typeof window & { __PAWGRESS__: { getState: () => { phase: string } } }).__PAWGRESS__;
    return bridge.getState().phase;
  })).toBe('target');
  await expect(page.getByRole('img', { name: /carrying warmth/ })).toBeVisible();
});

test('mobile journey has no horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Mobile-only layout assertion');
  await page.goto('/');
  const dimensions = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
});
