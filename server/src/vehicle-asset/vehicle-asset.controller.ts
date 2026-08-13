import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { VehicleAssetService } from './vehicle-asset.service';
import { UpsertVehicleAssetDto } from './dto/upsert-vehicle-asset.dto';

@Controller('vehicle-assets')
export class VehicleAssetController {
  constructor(private readonly service: VehicleAssetService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':nibar')
  findOne(@Param('nibar') nibar: string) {
    return this.service.findOne(nibar);
  }

  @Put(':nibar')
  upsert(@Param('nibar') nibar: string, @Body() dto: UpsertVehicleAssetDto) {
    return this.service.upsert(nibar, dto);
  }

  @Delete(':nibar')
  remove(@Param('nibar') nibar: string) {
    return this.service.remove(nibar);
  }

  @Post(':nibar/soft-delete')
  softDelete(@Param('nibar') nibar: string) {
    return this.service.softDelete(nibar);
  }
}
