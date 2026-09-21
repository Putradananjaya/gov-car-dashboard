import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { VehicleAssetService } from './vehicle-asset.service';
import { UpsertVehicleAssetDto } from './dto/upsert-vehicle-asset.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IzinGuard } from '../auth/izin.guard';
import { ButuhIzin } from '../auth/izin.decorator';

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
  @UseGuards(IzinGuard)
  @ButuhIzin('aset.ubah', 'aset.impor')
  upsert(@Param('nibar') nibar: string, @Body() dto: UpsertVehicleAssetDto) {
    return this.service.upsert(nibar, dto);
  }

  /**
   * Dipertahankan demi klien lama; perilakunya kini sama persis dengan
   * `POST :nibar/soft-delete` — tidak ada lagi penghapusan permanen di
   * aplikasi ini.
   */
  @Delete(':nibar')
  @UseGuards(IzinGuard)
  @ButuhIzin('aset.hapus', 'aset.impor')
  remove(@Param('nibar') nibar: string) {
    return this.service.remove(nibar);
  }

  @Post(':nibar/soft-delete')
  @UseGuards(IzinGuard)
  @ButuhIzin('aset.hapus')
  softDelete(@Param('nibar') nibar: string) {
    return this.service.softDelete(nibar);
  }
}
