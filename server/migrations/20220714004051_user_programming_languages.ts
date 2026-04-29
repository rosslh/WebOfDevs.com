import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // a programming language has a name and a color
  await knex.schema.createTable('github_programming_language', (table) => {
    table.increments('id').primary();
    table.string('name').unique().notNullable();
    table.string('color').notNullable();
  });

  // many users can have many programming languages
  await knex.schema.createTable(
    'user_github_programming_languages',
    (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable();
      table.integer('programming_language_id').unsigned().notNullable();
      table.foreign('user_id').references('id').inTable('user');
      table
        .foreign('programming_language_id')
        .references('id')
        .inTable('github_programming_language');
      table.unique(['user_id', 'programming_language_id']);
    },
  );
}

export async function down(knex: Knex): Promise<void> {
  // drop tables
  await knex.schema.dropTable('user_github_programming_languages');
  await knex.schema.dropTable('github_programming_language');
}
