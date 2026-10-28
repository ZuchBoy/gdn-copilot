import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGameById,
    getGamesByFilters,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategia', description: 'kat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Wydawca Jeden', description: 'wyd' })
        .returning({ id: publishers.id });

    // Wstawiamy tytuły w odwrotnej kolejności alfabetycznej, żeby sprawdzić sortowanie.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Gra ${String(i).padStart(2, '0')}`,
            description: `Opis ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

async function seedFilterableGames(db: Database): Promise<{ categoryIds: number[]; publisherIds: number[] }> {
    const categoryRows = await db
        .insert(categories)
        .values([
            { name: 'Strategia', description: 'kat' },
            { name: 'Przygodowa', description: 'kat' },
        ])
        .returning({ id: categories.id });
    const publisherRows = await db
        .insert(publishers)
        .values([
            { name: 'Wydawca Jeden', description: 'wyd' },
            { name: 'Wydawca Dwa', description: 'wyd' },
        ])
        .returning({ id: publishers.id });

    await db.insert(games).values([
        {
            title: 'Gra Alfa',
            description: 'Opis',
            starRating: 4.2,
            categoryId: categoryRows[0].id,
            publisherId: publisherRows[0].id,
        },
        {
            title: 'Gra Beta',
            description: 'Opis',
            starRating: 4.2,
            categoryId: categoryRows[1].id,
            publisherId: publisherRows[0].id,
        },
        {
            title: 'Gra Gamma',
            description: 'Opis',
            starRating: 4.2,
            categoryId: categoryRows[0].id,
            publisherId: publisherRows[1].id,
        },
    ]);

    return {
        categoryIds: categoryRows.map((row) => row.id),
        publisherIds: publisherRows.map((row) => row.id),
    };
}

describe('helpery dostępu do danych o grach', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('zwraca wszystkie gry posortowane po tytule', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Gra 01', 'Gra 02', 'Gra 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategia' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Wydawca Jeden' });
    });

    it('zwraca identyfikatory wszystkich gier posortowane po tytule', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('pobiera pojedynczą grę po id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Gra 01');
    });

    it('zwraca null dla nieistniejącej gry', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('dopasowuje gry do dowolnej z wybranych kategorii', async () => {
        const { categoryIds } = await seedFilterableGames(db);

        const filtered = await getGamesByFilters(db, { categoryIds });

        expect(filtered.map((game) => game.title)).toEqual(['Gra Alfa', 'Gra Beta', 'Gra Gamma']);
    });

    it('dopasowuje gry do dowolnego z wybranych wydawców', async () => {
        const { publisherIds } = await seedFilterableGames(db);

        const filtered = await getGamesByFilters(db, { publisherIds });

        expect(filtered.map((game) => game.title)).toEqual(['Gra Alfa', 'Gra Beta', 'Gra Gamma']);
    });

    it('łączy filtr kategorii z filtrem wydawcy', async () => {
        const { categoryIds, publisherIds } = await seedFilterableGames(db);

        const filtered = await getGamesByFilters(db, {
            categoryIds: [categoryIds[0]],
            publisherIds: [publisherIds[1]],
        });

        expect(filtered.map((game) => game.title)).toEqual(['Gra Gamma']);
    });

    it('traktuje brak filtrów i puste listy jak brak ograniczeń', async () => {
        await seedFilterableGames(db);

        const allWithoutFilters = await getGamesByFilters(db, {});
        const allWithEmptyLists = await getGamesByFilters(db, { categoryIds: [], publisherIds: [] });

        expect(allWithoutFilters.map((game) => game.title)).toEqual(['Gra Alfa', 'Gra Beta', 'Gra Gamma']);
        expect(allWithEmptyLists.map((game) => game.title)).toEqual(['Gra Alfa', 'Gra Beta', 'Gra Gamma']);
    });

    it('zwraca pustą listę, gdy filtry nie pasują do żadnej gry', async () => {
        await seedFilterableGames(db);

        const filtered = await getGamesByFilters(db, { categoryIds: [99999] });

        expect(filtered).toEqual([]);
    });
});
