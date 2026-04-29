import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // delete columns: location, company, github_email, notify_email
  await knex.schema.table('user', (table) => {
    table.dropColumn('location');
    table.dropColumn('company');
    table.dropColumn('github_email');
    table.dropColumn('notify_email');
  });
}

export async function down(knex: Knex): Promise<void> {
  // add columns: location, company, github_email, notify_email
  await knex.schema.table('user', (table) => {
    table.string('location').nullable();
    table.string('company').nullable();
    table.string('github_email').nullable();
    table.string('notify_email').nullable();
  });
}
