import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // add is_hidden column to github_programming_language table
  await knex.schema.table('github_programming_language', (table) => {
    table.boolean('is_hidden').defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  // remove is_hidden column from github_programming_language table
  await knex.schema.table('github_programming_language', (table) => {
    table.dropColumn('is_hidden');
  });
}
