import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // creates table favorite
  return await knex.schema.createTable('favorite', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('user');
    table
      .integer('favorite_user_id')
      .notNullable()
      .references('id')
      .inTable('user');

    table.unique(['user_id', 'favorite_user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  // drops table favorite
  return await knex.schema.dropTable('favorite');
}
