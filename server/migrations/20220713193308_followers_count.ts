import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // adds followers_count field to user
  return await knex.schema.table('user', (table) => {
    table.integer('followers_count').defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  // removes followers_count field from user
  return await knex.schema.table('user', (table) => {
    table.dropColumn('followers_count');
  });
}
