import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehicleOperationalEntity } from './vehicle-operational.entity';
import { VehicleOperationalService } from './vehicle-operational.service';
import { VehicleOperationalController } from './vehicle-operational.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VehicleOperationalEntity])],
  controllers: [VehicleOperationalController],
  providers: [VehicleOperationalService]
})
export class VehicleOperationalModule {}
