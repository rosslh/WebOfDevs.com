import { Knex } from 'knex';

export async function up(knex: Knex): Promise<[void]> {
  return Promise.all([
    knex.schema.createTable('user', (table) => {
      table.increments('id').primary();
      // Cannot be nullable and unique together
      table.string('website_url').nullable();
      table.string('github_username').notNullable().unique();
      table.string('name').nullable();
      table.string('profile_image_url').nullable();
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now()); // this does not auto-update
      table.string('notify_email').nullable();
      table.string('github_email').nullable();
      table.string('company').nullable();
      table.string('location').nullable();
      table
        .enum('status', [
          'not_submitted',
          'invalid_github_user',
          'no_website',
          'no_name',
          'invalid_name',
          'invalid_website',
          'requires_review',
          'rejected',
          'approved',
        ])
        .notNullable()
        .defaultTo('not_submitted');

      table.timestamp('first_authenticated_at').nullable();
      table.timestamp('last_authenticated_at').nullable();
    }),
  ]);
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.dropTable('user');
}
