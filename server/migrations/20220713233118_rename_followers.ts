import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // rename column "followers_count" to "github_num_followers"
  await knex.schema.table('user', (table) => {
    table.renameColumn('followers_count', 'github_num_followers');
  });
}

export async function down(knex: Knex): Promise<void> {
  // rename column "github_num_followers" to "followers_count"
  await knex.schema.table('user', (table) => {
    table.renameColumn('github_num_followers', 'followers_count');
  });
}
