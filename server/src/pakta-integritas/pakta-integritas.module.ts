import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaktaIntegritasEntity } from './pakta-integritas.entity';
import { PaktaIntegritasService } from './pakta-integritas.service';
import { PaktaIntegritasController } from './pakta-integritas.controller';
import { VehicleAssetEntity } from '../vehicle-asset/vehicle-asset.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PaktaIntegritasEntity, VehicleAssetEntity])],
  controllers: [PaktaIntegritasController],
  providers: [PaktaIntegritasService]
})
export class PaktaIntegritasModule {}
