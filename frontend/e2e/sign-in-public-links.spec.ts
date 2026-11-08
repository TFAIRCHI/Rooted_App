import { test, expect } from '@playwright/test';

test('readers use church links while sign-in stays for church teams', async ({ page }) => {
  await page.goto('/sign-in?access=member');
  await expect(page.getByRole('link', { name: 'Member sign in →' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Contributor or administrator sign in →' })).toHaveAttribute('href', /access=contributor/);

  await page.getByRole('link', { name: 'Use a church link or invitation →' }).click();
  await expect(page).toHaveURL(/\/find-church$/);
  const destination = '/c/grace/studies/10000000-0000-4000-8000-000000000001';
  await page.getByLabel('Church link or slug').fill(new URL(destination, page.url()).href);
  await page.getByRole('button', { name: 'Open church link →' }).click();
  await expect(page).toHaveURL(new RegExp(`${destination}$`));
});
