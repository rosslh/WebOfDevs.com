import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { KnexModule } from 'nestjs-knex';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { production } from '../knexfile.js';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GithubService } from './github.service';
import { MessageConsumer } from './message.consumer';
import { ScraperService } from './scraper.service.js';

import { AuthService } from './auth/auth.service';
import { AuthController } from './auth/auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './auth/jwt.strategy';
import { PassportModule } from '@nestjs/passport';

const enableScheduledScraper = process.env.ENABLE_SCHEDULED_SCRAPER === 'true';
const scraperImports = enableScheduledScraper ? [ScheduleModule.forRoot()] : [];
const scraperProviders = enableScheduledScraper
  ? [MessageConsumer, ScraperService]
  : [];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    KnexModule.forRoot({ config: production }),

    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST'),
          port: Number(config.get('REDIS_PORT')),
          password: config.get('REDIS_PASSWORD'),
          username: config.get('REDIS_USERNAME'),
        },
      }),
    }),
    BullModule.registerQueue({ name: 'message-queue' }),

    HttpModule.register({ timeout: 10_000, maxRedirects: 5 }),
    ...scraperImports,

    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60,
      },
    ]),

    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET is not set');
        }
        return {
          secret,
          signOptions: { expiresIn: '15m' },
        };
      },
    }),
  ],
  controllers: [AppController, AuthController],
  providers: [
    AppService,
    GithubService,
    ...scraperProviders,
    AuthService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [],
})
export class AppModule {}
