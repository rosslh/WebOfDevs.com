import { Knex } from 'knex';

export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS user_status_user_removed_name_idx
    ON "user" (status, user_removed, name)
  `);
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS favorite_favorite_user_id_idx
    ON favorite (favorite_user_id)
  `);
  await knex.raw(`
    CREATE INDEX CONCURRENTLY IF NOT EXISTS user_github_programming_languages_language_user_idx
    ON user_github_programming_languages (programming_language_id, user_id)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP INDEX CONCURRENTLY IF EXISTS user_github_programming_languages_language_user_idx
  `);
  await knex.raw(`
    DROP INDEX CONCURRENTLY IF EXISTS favorite_favorite_user_id_idx
  `);
  await knex.raw(`
    DROP INDEX CONCURRENTLY IF EXISTS user_status_user_removed_name_idx
  `);
}
