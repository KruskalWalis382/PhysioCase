import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import { getDb } from './src/db/client';
import { runMigrations } from './src/db/migrator';
import { createApp } from './src/server/app';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Detects an unbootable partial initdb directory (PG_VERSION present without
 * postgresql.conf, global/pg_control, or any user database directory) and moves
 * it to a backup path in the system temp directory so PGlite can re-initialize
 * cleanly without deleting any files or touching valid databases.
 */
function ensureBootableDataDir(dataDir: string): void {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    return;
  }

  const hasPgVersion = fs.existsSync(path.join(dataDir, 'PG_VERSION'));
  const hasPostgresqlConf = fs.existsSync(path.join(dataDir, 'postgresql.conf'));
  const hasPgControl = fs.existsSync(path.join(dataDir, 'global', 'pg_control'));

  if (!hasPgVersion || hasPostgresqlConf || hasPgControl) {
    return;
  }

  const baseDir = path.join(dataDir, 'base');
  const baseEntries = fs.existsSync(baseDir) ? fs.readdirSync(baseDir) : [];
  const hasUserDatabases = baseEntries.some((entry) => entry !== '1');

  if (hasUserDatabases) {
    // Never move a directory that may contain user database files
    return;
  }

  const backupDir = path.join(
    os.tmpdir(),
    `physiocase-pgdata-incomplete-${Date.now()}`
  );
  console.warn(
    `[db] Detected incomplete PGlite initdb directory at ${dataDir} (missing postgresql.conf and global/pg_control). Copying partial files to ${backupDir} before re-initializing.`
  );
  fs.cpSync(dataDir, backupDir, { recursive: true });
  fs.rmSync(dataDir, { recursive: true, force: true });
  fs.mkdirSync(dataDir, { recursive: true });
}

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  const port = !isProd ? 3000 : parseInt(process.env.PORT || '3000', 10);

  // Initialize persistent PGlite database
  const dataDir = path.resolve(process.env.PGDATA_DIR || path.resolve(__dirname, '.pgdata'));
  ensureBootableDataDir(dataDir);

  let db;
  try {
    db = await getDb({ dataDir });
    await runMigrations(db);
  } catch (err: any) {
    console.error('[db] Failed to initialize persistent PGlite database at', dataDir);
    console.error('[db] Underlying error:', err?.message || err);
    if (err?.cause) {
      console.error('[db] Cause:', err.cause);
    }
    throw err;
  }

  const app = createApp(db);

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`PhysioCase full-stack server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
