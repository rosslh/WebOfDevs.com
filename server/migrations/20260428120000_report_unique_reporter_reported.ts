import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Deduplicate any existing rows so the unique index can be added.
  await knex.raw(`
    DELETE FROM report
    WHERE id NOT IN (
      SELECT MIN(id)
      FROM report
      GROUP BY reporting_user_id, reported_user_id
    )
  `);

  await knex.schema.alterTable('report', (table) => {
    table.unique(['reporting_user_id', 'reported_user_id'], {
      indexName: 'report_reporting_user_id_reported_user_id_unique',
    });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('report', (table) => {
    table.dropUnique(
      ['reporting_user_id', 'reported_user_id'],
      'report_reporting_user_id_reported_user_id_unique',
    );
  });
}
