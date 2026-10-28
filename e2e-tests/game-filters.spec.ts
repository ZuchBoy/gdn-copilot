import { test, expect } from '@playwright/test';

test.describe('Filtrowanie gier', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('łączy wiele kategorii i wydawców oraz pozwala wyczyścić filtry', async ({ page }) => {
    const categoryFilters = page.locator('input[data-filter-kind="category"]');
    const publisherFilters = page.locator('input[data-filter-kind="publisher"]');
    const cards = page.getByTestId('game-card');

    expect(await categoryFilters.count()).toBeGreaterThan(1);
    expect(await publisherFilters.count()).toBeGreaterThan(1);

    const categoryIds = await categoryFilters.evaluateAll((filters) =>
      filters.slice(0, 2).map((filter) => (filter as HTMLInputElement).value),
    );
    const publisherIds = await publisherFilters.evaluateAll((filters) =>
      filters.slice(0, 2).map((filter) => (filter as HTMLInputElement).value),
    );
    const allCardsCount = await cards.count();
    const categorySelector = categoryIds.map((id) => `[data-category-id="${id}"]`).join(', ');
    const publisherSelector = publisherIds.map((id) => `[data-publisher-id="${id}"]`).join(', ');
    const categoryMatches = page.locator(
      `[data-testid="game-card"]:is(${categorySelector}):visible`,
    );
    const publisherMatches = page.locator(
      `[data-testid="game-card"]:is(${publisherSelector}):visible`,
    );
    const combinedMatches = page.locator(
      `[data-testid="game-card"]:is(${categorySelector}):is(${publisherSelector}):visible`,
    );
    const expectedCategoryCount = await categoryMatches.count();
    const expectedPublisherCount = await publisherMatches.count();
    const expectedCombinedCount = await combinedMatches.count();

    await test.step('Filtruj po kilku kategoriach', async () => {
      await categoryFilters.nth(0).check();
      await categoryFilters.nth(1).check();
      await expect(page.locator('[data-testid="game-card"]:visible')).toHaveCount(expectedCategoryCount);
      await expect(page.getByTestId('filter-results-count')).toHaveText(
        `Wyniki: ${expectedCategoryCount} z ${allCardsCount}.`,
      );
    });

    await test.step('Filtruj po kilku wydawcach', async () => {
      await categoryFilters.nth(0).uncheck();
      await categoryFilters.nth(1).uncheck();
      await publisherFilters.nth(0).check();
      await publisherFilters.nth(1).check();
      await expect(page.locator('[data-testid="game-card"]:visible')).toHaveCount(expectedPublisherCount);
      await expect(page.getByTestId('filter-results-count')).toHaveText(
        `Wyniki: ${expectedPublisherCount} z ${allCardsCount}.`,
      );
    });

    await test.step('Połącz filtry kategorii i wydawcy', async () => {
      await categoryFilters.nth(0).check();
      await categoryFilters.nth(1).check();
      await expect(page.locator('[data-testid="game-card"]:visible')).toHaveCount(expectedCombinedCount);
      await expect(page.getByTestId('filter-results-count')).toHaveText(
        `Wyniki: ${expectedCombinedCount} z ${allCardsCount}.`,
      );
      await expect(page.getByTestId('filter-empty-state')).toBeHidden();
    });

    await test.step('Wyczyść wszystkie filtry', async () => {
      await page.getByRole('button', { name: 'Wyczyść filtry' }).click();
      await expect(page.locator('[data-testid="game-card"]:visible')).toHaveCount(allCardsCount);
      await expect(page.getByTestId('filter-results-count')).toHaveText(
        `Wyniki: ${allCardsCount} z ${allCardsCount}.`,
      );
    });
  });

  test('obsługuje checkboxy kategorii z klawiatury', async ({ page }) => {
    const categoryFilter = page.getByRole('checkbox').first();
    const categoryId = await categoryFilter.getAttribute('value');
    const matchingCards = page.locator(
      `[data-testid="game-card"][data-category-id="${categoryId}"]`,
    );

    await categoryFilter.focus();
    await expect(categoryFilter).toBeFocused();
    const hasVisibleFocus = await categoryFilter.evaluate((input) => {
      const label = input.closest('label');
      if (!label) return false;
      const styles = window.getComputedStyle(label);
      return styles.outline !== 'none' || styles.boxShadow !== 'none';
    });
    expect(hasVisibleFocus).toBeTruthy();
    await page.keyboard.press('Space');

    await expect(categoryFilter).toBeChecked();
    await expect(page.locator('[data-testid="game-card"]:visible')).toHaveCount(await matchingCards.count());
  });
});
