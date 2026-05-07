import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';

async function runSeed() {
  process.env.ENABLE_DEMO_DASHBOARD_SEED = 'true';
  process.env.ENABLE_TOUR_JSON_IMPORT = 'false';

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  console.log('✅ Seed complete. Closing app...');
  await app.close();
}

runSeed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exitCode = 1;
});
