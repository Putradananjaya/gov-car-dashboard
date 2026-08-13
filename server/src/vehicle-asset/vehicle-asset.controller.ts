import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { VehicleAssetService } from './vehicle-asset.service';
import { UpsertVehicleAssetDto } from './dto/upsert-vehicle-asset.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('vehicle-assets')
@UseGuards(JwtAuthGuard)
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
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  remove(@Param('nibar') nibar: string) {
    return this.service.remove(nibar);
  }

  @Post(':nibar/soft-delete')
  softDelete(@Param('nibar') nibar: string) {
    return this.service.softDelete(nibar);
  }
}
