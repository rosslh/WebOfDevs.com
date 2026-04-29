import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // add "github_num_stars" column to "user" table
  await knex.schema.table('user', (table) => {
    table.integer('github_num_stars').unsigned().defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  // remove "github_num_stars" column from "user" table
  await knex.schema.table('user', (table) => {
    table.dropColumn('github_num_stars');
  });
}
