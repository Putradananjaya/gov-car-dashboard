import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { VehicleOperationalService } from './vehicle-operational.service';
import { UpsertVehicleOperationalDto } from './dto/upsert-vehicle-operational.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('vehicle-operational')
@UseGuards(JwtAuthGuard)
export class VehicleOperationalController {
  constructor(private readonly service: VehicleOperationalService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':nibar')
  findOne(@Param('nibar') nibar: string) {
    return this.service.findOne(nibar);
  }

  @Put(':nibar')
  upsert(@Param('nibar') nibar: string, @Body() dto: UpsertVehicleOperationalDto) {
    return this.service.upsert(nibar, dto);
  }

  @Delete(':nibar')
  remove(@Param('nibar') nibar: string) {
    return this.service.remove(nibar);
  }
}
