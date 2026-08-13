import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { VehicleAssetModule } from './vehicle-asset/vehicle-asset.module';
import { VehicleOperationalModule } from './vehicle-operational/vehicle-operational.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { SeedModule } from './seed/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Railway (dan penyedia Postgres terkelola lain) menyediakan satu
        // connection string lewat DATABASE_URL (konvensi Heroku/Railway) —
        // dipakai kalau ada; dev lokal tetap pakai DB_HOST/DB_PORT/dst.
        const databaseUrl = config.get<string>('DATABASE_URL');

        return {
          type: 'postgres',
          ...(databaseUrl
            ? { url: databaseUrl, ssl: { rejectUnauthorized: false } }
            : {
                host: config.get<string>('DB_HOST', 'localhost'),
                port: config.get<number>('DB_PORT', 5432),
                username: config.get<string>('DB_USER', 'pusaka'),
                password: config.get<string>('DB_PASSWORD', 'pusaka_dev_only'),
                database: config.get<string>('DB_NAME', 'pusaka_bangli')
              }),
          autoLoadEntities: true,
          // Sinkronisasi skema otomatis dari entity — hanya untuk pengembangan
          // lokal (dokumen v2 Fase 5a keputusan #2). Migrasi formal Postgres
          // ditunda ke putaran "pengerasan deployment".
          synchronize: true
        };
      }
    }),
    // Lapis pembatasan laju generik per-IP (dokumen v2 bag. 5, "pembatasan
    // laju") — di atas lockout per-NIP yang lebih spesifik di AuthService.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    UserModule,
    AuthModule,
    SeedModule,
    VehicleAssetModule,
    VehicleOperationalModule
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
})
export class AppModule {}
