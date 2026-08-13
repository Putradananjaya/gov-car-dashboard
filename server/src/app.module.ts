import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleAssetModule } from './vehicle-asset/vehicle-asset.module';
import { VehicleOperationalModule } from './vehicle-operational/vehicle-operational.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USER', 'pusaka'),
        password: config.get<string>('DB_PASSWORD', 'pusaka_dev_only'),
        database: config.get<string>('DB_NAME', 'pusaka_bangli'),
        autoLoadEntities: true,
        // Sinkronisasi skema otomatis dari entity — hanya untuk pengembangan
        // lokal (dokumen v2 Fase 5a keputusan #2). Migrasi formal Postgres
        // ditunda ke putaran "pengerasan deployment".
        synchronize: true
      })
    }),
    VehicleAssetModule,
    VehicleOperationalModule
  ]
})
export class AppModule {}
