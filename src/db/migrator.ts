import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface MigrationRecord {
  version: number;
  name: string;
  checksum: string;
  applied_at: string;
}

export interface MigrationResult {
  appliedCount: number;
  appliedMigrations: string[];
}

/**
 * Ensures the migration tracking table exists.
 */
async function ensureMigrationsTable(db: PGlite): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      version integer PRIMARY KEY,
      name text NOT NULL,
      checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT clock_timestamp()
    );
  `);
}

/**
 * Computes SHA-256 checksum for migration content.
 */
function computeChecksum(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Discovers and applies all pending SQL migrations in ascending numerical order.
 */
export async function runMigrations(db: PGlite, customMigrationsDir?: string): Promise<MigrationResult> {
  await ensureMigrationsTable(db);

  const appliedRes = await db.query<MigrationRecord>(
    'SELECT version, name, checksum, applied_at FROM _schema_migrations ORDER BY version ASC'
  );
  const appliedVersions = new Set(appliedRes.rows.map((r) => r.version));

  // Determine migrations directory
  let migrationsDir = customMigrationsDir;
  if (!migrationsDir) {
    const candidatePaths = [
      path.resolve(process.cwd(), 'src/db/migrations'),
      path.resolve(__dirname, 'migrations'),
      path.resolve(__dirname, '../src/db/migrations'),
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        migrationsDir = p;
        break;
      }
    }
  }

  if (!migrationsDir || !fs.existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found. Checked candidate paths.`);
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const appliedMigrations: string[] = [];

  for (const file of files) {
    const match = file.match(/^(\d+)_(.+)\.sql$/);
    if (!match) continue;

    const version = parseInt(match[1], 10);
    const name = match[2];

    if (appliedVersions.has(version)) {
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    const checksum = computeChecksum(sqlContent);

    // Apply inside a transaction block
    await db.query('BEGIN');
    try {
      await db.exec(sqlContent);
      await db.query(
        `INSERT INTO _schema_migrations (version, name, checksum, applied_at)
         VALUES ($1, $2, $3, clock_timestamp())`,
        [version, name, checksum]
      );
      await db.query('COMMIT');
      appliedMigrations.push(file);
    } catch (err: any) {
      await db.query('ROLLBACK');
      throw new Error(`Migration ${file} failed: ${err.message}`);
    }
  }

  return {
    appliedCount: appliedMigrations.length,
    appliedMigrations,
  };
}
