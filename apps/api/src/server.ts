import { buildApp } from './app.js';
import { env } from './config/env.js';

const start = async () => {
  const app = await buildApp();

  try {
    await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
    app.log.info(`API listening on http://localhost:${env.API_PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
