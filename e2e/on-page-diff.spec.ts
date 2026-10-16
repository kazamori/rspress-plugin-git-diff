import { expect, test } from '@playwright/test';
import { hashOf } from './history';

const ADD_CHECKS = '初期化のコマンドと事前の確認を加える';

test.describe('marks on the page', () => {
  test('paragraphs, list items, code lines and a removed sentence', async ({ page }) => {
    await page.goto(`/guide/install?diff=${hashOf(ADD_CHECKS)}`);

    await expect(page.locator('p.rp-git-diff-added')).toHaveText('作業の前に、次の 2 点を確かめる。');
    await expect(page.locator('li.rp-git-diff-added')).toHaveText([
      'ネットワークに接続している',
      '書き込みの権限がある',
    ]);
    await expect(page.locator('pre .rp-git-diff-added-line')).toHaveText('npx example init');
    await expect(page.locator('div.rp-git-diff-deleted')).toContainText(
      'インストールが終わったら、設定ファイルを作る。',
    );
  });

  test('a changed line of code next to the removed one', async ({ page }) => {
    await page.goto(`/guide/install?diff=${hashOf('インストールのコマンドの誤記を直す')}`);

    await expect(page.locator('pre .rp-git-diff-deleted-line')).toHaveText('npm instal example');
    await expect(page.locator('pre .rp-git-diff-added-line')).toHaveText('npm install example');
  });

  test('table rows', async ({ page }) => {
    await page.goto(`/guide/configuration?diff=${hashOf('retries の既定値を直す')}`);

    await expect(page.locator('tr.rp-git-diff-deleted')).toContainText('3');
    await expect(page.locator('tr.rp-git-diff-added')).toContainText('5');
  });
});

test.describe('the bar', () => {
  test('shows the commit and closes', async ({ page }) => {
    const hash = hashOf(ADD_CHECKS);
    await page.goto(`/guide/install?diff=${hash}`);

    const bar = page.locator('.rp-git-diff-bar');
    await expect(bar).toContainText(ADD_CHECKS);
    await expect(bar).toContainText('Carol');

    await bar.getByRole('button', { name: '閉じる' }).click();
    await expect(bar).toHaveCount(0);
    await expect(page.locator('.rp-git-diff-added')).toHaveCount(0);
    expect(new URL(page.url()).searchParams.has('diff')).toBe(false);
  });

  test('moves between the changes with the buttons and the keys', async ({ page }) => {
    // Short enough that the changes do not fit on the screen together.
    await page.setViewportSize({ width: 1280, height: 400 });
    await page.goto(`/guide/install?diff=${hashOf(ADD_CHECKS)}`);

    const counter = page.locator('.rp-git-diff-counter');
    await expect(counter).toHaveText('3 か所');
    const current = page.locator('.rp-git-diff-current');

    await page.getByRole('button', { name: '次の変更' }).click();
    await expect(counter).toHaveText('1 / 3');
    await expect(current.first()).toContainText('作業の前に');

    await page.keyboard.press('n');
    await expect(counter).toHaveText('2 / 3');
    await expect(current).toHaveText('npx example init');

    await page.keyboard.press('j');
    await expect(counter).toHaveText('3 / 3');
    await expect(current).toContainText('インストールが終わったら');

    await page.keyboard.press('p');
    await expect(counter).toHaveText('2 / 3');
    await page.keyboard.press('k');
    await expect(counter).toHaveText('1 / 3');
    await page.getByRole('button', { name: '前の変更' }).click();
    await expect(counter).toHaveText('3 / 3');
  });

  test('hides the buttons when every change is on the screen', async ({ page }) => {
    await page.goto(`/guide/configuration?diff=${hashOf('retries の既定値を直す')}`);

    await expect(page.locator('.rp-git-diff-counter')).toHaveText('1 か所');
    await expect(page.getByRole('button', { name: '次の変更' })).toHaveCount(0);
  });

  test('opens the source diff', async ({ page }) => {
    await page.goto(`/guide/install?diff=${hashOf(ADD_CHECKS)}`);

    await page.getByRole('button', { name: 'ソースの差分' }).click();
    const panel = page.getByRole('dialog', { name: 'ソースの差分' });
    await expect(panel.locator('.d2h-ins')).toContainText(['作業の前に、次の 2 点を確かめる。']);
    await expect(panel.locator('.d2h-del')).toContainText(['インストールが終わったら']);

    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
  });
});

test.describe('English pages', () => {
  test.use({ locale: 'en-US' });

  test('shows the bar in English', async ({ page }) => {
    await page.goto(`/en/guide/install?diff=${hashOf('必要な Node.js の版を 20 に上げる')}`);

    await expect(page.locator('.rp-git-diff-added')).toContainText('Node.js 20');
    await expect(page.getByRole('button', { name: 'Source diff' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
  });
});
