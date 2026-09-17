import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleAssetEntity } from '../vehicle-asset/vehicle-asset.entity';
import { VehicleOperationalEntity } from '../vehicle-operational/vehicle-operational.entity';
import { PublicStatsService } from './public-stats.service';
import { PublicStatsController } from './public-stats.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleAssetEntity, VehicleOperationalEntity])],
  controllers: [PublicStatsController],
  providers: [PublicStatsService]
})
export class PublicStatsModule {}
