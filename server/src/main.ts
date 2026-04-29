import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

const DEFAULT_DEV_ORIGINS = ['http://localhost:3000', 'https://localhost:3000'];

function parseOrigins(raw: string | undefined): string[] {
  if (!raw) return DEFAULT_DEV_ORIGINS;
  return raw
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({
    origin: parseOrigins(process.env.CORS_ORIGINS),
    methods: ['DELETE', 'GET', 'PATCH', 'POST', 'PUT'],
    credentials: true,
  });
  app.use(cookieParser());
  await app.listen(process?.env?.PORT ?? 9000);
}
bootstrap();
