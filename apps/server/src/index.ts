import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildApp } from './app.js';
import { env } from './config/env.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  const dbPackageDir = path.resolve(__dirname, '../../packages/db');
  try {
    console.log('Running database schema push...');
    execSync('npx drizzle-kit push', {
      cwd: dbPackageDir,
      stdio: 'inherit',
      shell: true as unknown as string,
      env: { ...process.env, DATABASE_URL: env.DATABASE_URL },
    });
    console.log('Database schema push complete.');
  } catch (err) {
    console.error('Database schema push failed:', err);
    process.exit(1);
  }
}

async function main() {
  // Auto-push schema on startup (production only)
  if (env.NODE_ENV === 'production') {
    await runMigrations();
  }

  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Server running at http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
