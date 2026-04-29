import { readdirSync } from 'fs';
import { extname, join, basename } from 'path';
import { config } from 'dotenv';

config();

class TsCompatMigrationSource {
  constructor(private readonly directory: string) {}

  getMigrations() {
    return Promise.resolve(
      readdirSync(this.directory)
        .filter((file) => extname(file) === '.js' && !file.endsWith('.d.js'))
        .map((file) => ({
          file,
          name: `${basename(file, '.js')}.ts`,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  }

  getMigrationName(migration: { name: string }) {
    return migration.name;
  }

  async getMigration(migration: { file: string }) {
    return require(join(this.directory, migration.file));
  }
}

const migrationsDirectory = join(__dirname, 'migrations');

export const production = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? Number(process.env.DB_PORT) : undefined,
    database: process.env.DB_DATABASE_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
  },
  pool: {
    min: 2,
    max: 12,
    acquireTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
    reapIntervalMillis: 1_000,
  },
  migrations: {
    tableName: 'knex_migrations',
    migrationSource: new TsCompatMigrationSource(migrationsDirectory),
  },
};

export const onUpdateTrigger = (table: string) => `
CREATE TRIGGER ${table}_updated_at
BEFORE UPDATE ON "${table}"
FOR EACH ROW
EXECUTE PROCEDURE on_update_timestamp();
`;
