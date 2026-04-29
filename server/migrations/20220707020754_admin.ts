import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // adds isAdmin column to user table
  return await knex.schema.table('user', (table) => {
    table.boolean('is_admin').defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  // removes isAdmin column from user table
  return await knex.schema.table('user', (table) => {
    table.dropColumn('is_admin');
  });
}
