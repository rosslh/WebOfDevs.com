import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // add is_user_submitted column to user table
  return await knex.schema.table('user', (table) => {
    table.boolean('is_user_submitted').defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  // remove is_user_submitted column from user table
  return await knex.schema.table('user', (table) => {
    table.dropColumn('is_user_submitted');
  });
}
