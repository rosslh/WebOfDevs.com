import { Knex } from 'knex';
import { onUpdateTrigger } from '../knexfile';

const ON_UPDATE_TIMESTAMP_FUNCTION = `
  CREATE OR REPLACE FUNCTION on_update_timestamp()
  RETURNS trigger AS $$
  BEGIN
    NEW.updated_at = now();
    RETURN NEW;
  END;
  $$ language 'plpgsql';
`;

const DROP_ON_UPDATE_TIMESTAMP_FUNCTION = `DROP FUNCTION on_update_timestamp`;

exports.up = (knex: Knex) =>
  knex
    .raw(ON_UPDATE_TIMESTAMP_FUNCTION)
    .then(() => knex.raw(onUpdateTrigger('user')));

exports.down = (knex: Knex) =>
  knex.raw(DROP_ON_UPDATE_TIMESTAMP_FUNCTION).then(() =>
    knex.raw(`
      DROP TRIGGER user_updated_at ON user;
    `),
  );
