import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleAssetEntity } from './vehicle-asset.entity';
import { VehicleAssetService } from './vehicle-asset.service';
import { VehicleAssetController } from './vehicle-asset.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleAssetEntity])],
  controllers: [VehicleAssetController],
  providers: [VehicleAssetService]
})
export class VehicleAssetModule {}
