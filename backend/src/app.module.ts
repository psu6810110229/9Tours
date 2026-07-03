import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ToursModule } from './tours/tours.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FestivalsModule } from './festivals/festivals.module';
import { FavoritesModule } from './favorites/favorites.module';
import { ReviewsModule } from './reviews/reviews.module';
import { StorageModule } from './common/storage.module';
import { validateEnv } from './config/env.validation';

@Module({
  imports: [
    // 1. ตั้งค่าให้ NestJS อ่านไฟล์ .env
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),

    // 2. ตั้งค่าการเชื่อมต่อ Database โดยดึงค่าจาก ConfigService
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: configService.get<boolean>('DB_SYNCHRONIZE') ?? false,
        ssl: configService.get<string>('DB_SSL') === 'true'
          ? { rejectUnauthorized: false }
          : false,
      }),
    }),

    // เปิดใช้งาน Schedule สำหรับระบบ Cron Jobs (คืนที่นั่งอัตโนมัติ)
    ScheduleModule.forRoot(),

    // Storage Module (Local or S3)
    StorageModule,

    ToursModule,
    UsersModule,
    AuthModule,
    BookingsModule,
    PaymentsModule,
    AnalyticsModule,
    NotificationsModule,
    FestivalsModule,
    FavoritesModule,
    ReviewsModule,
  ],
})
export class AppModule { }
