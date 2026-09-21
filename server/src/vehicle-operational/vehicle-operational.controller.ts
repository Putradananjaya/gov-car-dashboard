import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { VehicleOperationalService } from './vehicle-operational.service';
import { UpsertVehicleOperationalDto } from './dto/upsert-vehicle-operational.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IzinGuard } from '../auth/izin.guard';
import { ButuhIzin } from '../auth/izin.decorator';

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
  @UseGuards(IzinGuard)
  @ButuhIzin('aset.ubah', 'aset.ubahStatusOperasional', 'aset.impor')
  upsert(@Param('nibar') nibar: string, @Body() dto: UpsertVehicleOperationalDto) {
    return this.service.upsert(nibar, dto);
  }

  /** Soft delete — lihat `VehicleOperationalService.remove`. */
  @Delete(':nibar')
  @UseGuards(IzinGuard)
  @ButuhIzin('aset.hapus', 'aset.impor')
  remove(@Param('nibar') nibar: string) {
    return this.service.remove(nibar);
  }
}
