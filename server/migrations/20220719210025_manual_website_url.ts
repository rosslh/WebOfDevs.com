import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // add manual_website_url column to "user" table
  return await knex.schema.table('user', (table) => {
    table.string('manual_website_url').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  // remove manual_website_url column from "user" table
  return await knex.schema.table('user', (table) => {
    table.dropColumn('manual_website_url');
  });
}
