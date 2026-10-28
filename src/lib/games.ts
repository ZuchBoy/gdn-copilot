import { and, asc, eq, inArray, type SQL } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

/**
 * Opcjonalne filtry listy gier oparte na identyfikatorach relacji.
 */
export interface GameFilters {
    categoryIds?: number[];
    publisherIds?: number[];
}

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

/** Wszystkie gry posortowane po tytule. */
export async function getAllGames(db: Database): Promise<Game[]> {
    const rows = await baseGamesQuery(db).orderBy(asc(games.title));
    return rows.map(mapGame);
}

/**
 * Zwraca gry spełniające filtry kategorii i wydawców, posortowane po tytule.
 *
 * Wartości w obrębie każdego filtra są łączone przez OR, a filtry kategorii
 * i wydawców przez AND. Pusta lista nie ogranicza wyników.
 *
 * @param db - Wstrzyknięta instancja bazy danych.
 * @param filters - Identyfikatory kategorii i wydawców do uwzględnienia.
 * @returns Pasujące gry posortowane alfabetycznie po tytule.
 */
export async function getGamesByFilters(db: Database, filters: GameFilters): Promise<Game[]> {
    const conditions: SQL[] = [];

    if (filters.categoryIds && filters.categoryIds.length > 0) {
        conditions.push(inArray(games.categoryId, filters.categoryIds));
    }

    if (filters.publisherIds && filters.publisherIds.length > 0) {
        conditions.push(inArray(games.publisherId, filters.publisherIds));
    }

    const where = and(...conditions);
    const query = baseGamesQuery(db);
    const rows = where
        ? await query.where(where).orderBy(asc(games.title))
        : await query.orderBy(asc(games.title));

    return rows.map(mapGame);
}

/** Identyfikatory wszystkich gier posortowane po tytule. */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/** Pojedyncza gra po id albo null, gdy nie istnieje. */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}
