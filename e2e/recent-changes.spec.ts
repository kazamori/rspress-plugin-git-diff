import { expect, test } from '@playwright/test';
import { hashOf } from './history';

test.describe('recent changes page', () => {
  test('lists the commits, newest first, without the hidden ones', async ({ page }) => {
    await page.goto('/changes');

    const subjects = page.locator('.rp-git-diff-subject');
    await expect(subjects.first()).toHaveText('リリースの手順に記録の作業を加える');
    // References to issues are stripped from the subjects.
    await expect(subjects).toContainText(['インストールのコマンドの誤記を直す']);
    // A commit that only reflows a paragraph is left out.
    await expect(subjects.filter({ hasText: '一文一行に整形する' })).toHaveCount(0);
  });

  test('links a change to the page with its diff', async ({ page }) => {
    await page.goto('/changes');

    const change = page
      .locator('.rp-git-diff-commit')
      .filter({ hasText: '初期化のコマンドと事前の確認を加える' });
    await change.getByRole('link', { name: 'ページ上で表示' }).click();
    await expect(page).toHaveURL(
      new RegExp(`/guide/install(\\.html)?\\?diff=${hashOf('初期化のコマンドと事前の確認を加える')}`),
    );
    await expect(page.locator('.rp-git-diff-bar')).toBeVisible();
  });

  test('collapses a long diff until it is expanded', async ({ page }) => {
    await page.goto('/changes');

    const commit = page
      .locator('.rp-git-diff-commit')
      .filter({ hasText: 'リリースの手順に記録の作業を加える' });
    const expand = commit.getByRole('button', { name: '差分を表示する（変更 60 行）' });
    await expect(expand).toBeVisible();
    await expect(commit.locator('.d2h-wrapper')).toHaveCount(0);

    await expand.click();
    await expect(commit.locator('.d2h-wrapper')).toBeVisible();

    // The button is above and below the diff, so that it is at hand at either end.
    const collapse = commit.getByRole('button', { name: '差分を折りたたむ' });
    await expect(collapse).toHaveCount(2);
    await collapse.last().click();
    await expect(commit.locator('.d2h-wrapper')).toHaveCount(0);
  });

  test('switches between unified and side by side', async ({ page }) => {
    await page.goto('/changes');

    const commit = page
      .locator('.rp-git-diff-commit')
      .filter({ hasText: '初期化のコマンドと事前の確認を加える' });
    await expect(commit.locator('.d2h-file-diff')).toBeVisible();

    await page.getByRole('button', { name: '左右に並べる' }).click();
    await expect(commit.locator('.d2h-file-side-diff')).toHaveCount(2);
  });

  test.describe('in the dark theme', () => {
    test.use({ colorScheme: 'dark' });

    test('uses the dark colors of the diff', async ({ page }) => {
      await page.goto('/changes');

      await expect(page.locator('html')).toHaveClass(/dark/);
      await expect(page.locator('.d2h-wrapper').first()).toHaveClass(/d2h-dark-color-scheme/);
    });
  });

  test.describe('in English', () => {
    test.use({ locale: 'en-US' });

    test('lists only the changes of the English pages', async ({ page }) => {
      await page.goto('/en/changes');

      await expect(page.getByRole('heading', { level: 1 })).toContainText('Recent changes');
      await expect(page.locator('.rp-git-diff-subject')).toHaveText([
        '必要な Node.js の版を 20 に上げる',
      ]);
    });
  });
});
