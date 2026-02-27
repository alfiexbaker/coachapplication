import { buildApp } from './app.js';
import { env } from '@clubroom/config';

async function main() {
  const app = buildApp();

  try {
    await app.listen({
      host: env.API_HOST,
      port: env.API_PORT,
    });
  } catch (error) {
    app.log.error(error, 'Failed to start server');
    process.exit(1);
  }
}

void main();
