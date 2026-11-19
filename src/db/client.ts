import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';

let globalDb: PGlite | null = null;

export interface DatabaseClientOptions {
  dataDir?: string;
  forceFresh?: boolean;
}

/**
 * Returns the singleton PGlite database client instance.
 * Supports in-memory or persisted directory.
 */
export async function getDb(options?: DatabaseClientOptions): Promise<PGlite> {
  if (options?.forceFresh && globalDb) {
    await globalDb.close();
    globalDb = null;
  }

  if (!globalDb) {
    const dataDir = options?.dataDir ? path.resolve(options.dataDir) : undefined;
    try {
      if (dataDir) {
        fs.mkdirSync(dataDir, { recursive: true });
        fs.accessSync(dataDir, fs.constants.R_OK | fs.constants.W_OK);
        globalDb = new PGlite(dataDir);
      } else {
        globalDb = new PGlite();
      }
      await globalDb.waitReady;
    } catch (err: any) {
      globalDb = null;
      const fsState = dataDir
        ? {
            dataDir,
            exists: fs.existsSync(dataDir),
            hasPgVersion: fs.existsSync(path.join(dataDir, 'PG_VERSION')),
            hasPostgresqlConf: fs.existsSync(path.join(dataDir, 'postgresql.conf')),
            hasPgControl: fs.existsSync(path.join(dataDir, 'global', 'pg_control')),
            hasPostmasterPid: fs.existsSync(path.join(dataDir, 'postmaster.pid')),
          }
        : { mode: 'in-memory' };
      console.error('PGlite initialization failed:', {
        message: err?.message || String(err),
        cause: err?.cause,
        fsState,
      });
      throw err;
    }
  }

  return globalDb;
}

/**
 * Closes and resets the global database client instance (primarily for test teardowns).
 */
export async function closeDb(): Promise<void> {
  if (globalDb) {
    await globalDb.close();
    globalDb = null;
  }
}
