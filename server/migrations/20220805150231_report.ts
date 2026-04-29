import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // create table report which has foreign key to reported user and reporting user
  return await knex.schema.createTable('report', (table) => {
    table.increments('id').primary();
    table.integer('reported_user_id').notNullable();
    table.integer('reporting_user_id').notNullable();
    table.string('reason').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.boolean('resolved').defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  return await knex.schema.dropTable('report');
}
