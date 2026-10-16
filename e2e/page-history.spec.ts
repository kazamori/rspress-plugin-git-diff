import { expect, test } from '@playwright/test';
import { hashOf } from './history';

// The example site places both entries: before the doc footer and in the nav.

test.describe('page history', () => {
  test('the entry before the footer shows the number of changes', async ({ page }) => {
    await page.goto('/guide/install');

    await expect(page.locator('.rp-git-diff-history-link')).toHaveText(
      'このページの変更履歴（4 件、最終更新 2026-09-11）',
    );
    // The entry stays before the doc footer.
    await expect(page.locator('.rp-git-diff-slot + .rp-doc-footer')).toHaveCount(1);
  });

  test('opens from the footer and closes with Back', async ({ page }) => {
    await page.goto('/guide/install');

    await page.locator('.rp-git-diff-history-link a').click();
    const drawer = page.getByRole('dialog', { name: 'ページの変更履歴' });
    await expect(drawer.locator('.rp-git-diff-subject')).toHaveText([
      '初期化のコマンドと事前の確認を加える',
      '設定のページの URL を変え、retries の既定値を直す',
      '必要な Node.js の版を 20 に上げる',
      'インストールのコマンドの誤記を直す',
      'ドキュメントを追加する',
    ]);
    expect(new URL(page.url()).searchParams.has('history')).toBe(true);
    // The revision that added the page has no diff.
    await expect(drawer.locator('.rp-git-diff-commit').last()).toContainText('ページを追加しました');

    await page.goBack();
    await expect(drawer).toHaveCount(0);
    expect(new URL(page.url()).searchParams.has('history')).toBe(false);
  });

  test('opens from the navigation bar and closes with Escape and the button', async ({ page }) => {
    await page.goto('/guide/install');

    await page.getByRole('link', { name: 'このページの変更履歴を表示する' }).click();
    const drawer = page.getByRole('dialog', { name: 'ページの変更履歴' });
    await expect(drawer).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);

    await page.goto('/guide/install?history');
    await expect(drawer).toBeVisible();
    await drawer.getByRole('button', { name: '閉じる' }).click();
    await expect(drawer).toHaveCount(0);
    expect(new URL(page.url()).searchParams.has('history')).toBe(false);
  });

  test('loads the diffs and opens a revision on the page', async ({ page }) => {
    await page.goto('/guide/install?history');

    const drawer = page.getByRole('dialog', { name: 'ページの変更履歴' });
    const first = drawer.locator('.rp-git-diff-commit').first();
    await expect(first.locator('.rp-git-diff-body')).toContainText('作業の前に');

    await first.getByRole('link', { name: 'ページ上で表示' }).click();
    await expect(drawer).toHaveCount(0);
    await expect(page.locator('.rp-git-diff-bar')).toContainText(
      '初期化のコマンドと事前の確認を加える',
    );
    expect(page.url()).toContain(`diff=${hashOf('初期化のコマンドと事前の確認を加える')}`);
  });

  test('moves with the page in the app', async ({ page }) => {
    await page.goto('/guide/install');
    await page.locator('aside a', { hasText: '設定' }).first().click();

    await expect(page).toHaveURL(/\/guide\/configuration/);
    await expect(page.locator('.rp-git-diff-history-link')).toHaveText(
      'このページの変更履歴（2 件、最終更新 2026-09-07）',
    );
  });

  test('has no entry on a page without history', async ({ page }) => {
    await page.goto('/changes');

    await expect(page.locator('.rp-git-diff-commit').first()).toBeVisible();
    await expect(page.locator('.rp-git-diff-history-link')).toHaveCount(0);
    await expect(page.locator('.rp-git-diff-history-button')).toHaveCount(0);
  });
});
