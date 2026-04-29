import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  return await knex.schema.table('user', (table) => {
    table.boolean('user_removed').defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  return await knex.schema.table('user', (table) => {
    table.dropColumn('user_removed');
  });
}
