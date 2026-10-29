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
    if (options?.dataDir) {
      globalDb = new PGlite(options.dataDir);
    } else {
      globalDb = new PGlite();
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
