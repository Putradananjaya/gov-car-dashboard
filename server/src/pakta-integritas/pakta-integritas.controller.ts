import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { PaktaIntegritasService } from './pakta-integritas.service';
import { UpsertPaktaIntegritasDto } from './dto/upsert-pakta-integritas.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IzinGuard } from '../auth/izin.guard';
import { ButuhIzin } from '../auth/izin.decorator';

@Controller('pakta-integritas')
@UseGuards(JwtAuthGuard)
export class PaktaIntegritasController {
  constructor(private readonly service: PaktaIntegritasService) {}

  /** Hanya data ringkas (tanpa isi berkas) — cukup untuk kolom status di Data Kendaraan. */
  @Get()
  @UseGuards(IzinGuard)
  @ButuhIzin('aset.lihat')
  findAll() {
    return this.service.findAll();
  }

  @Get(':nibar/berkas')
  @UseGuards(IzinGuard)
  @ButuhIzin('aset.lihat')
  findBerkas(@Param('nibar') nibar: string) {
    return this.service.findBerkas(nibar);
  }

  @Put(':nibar')
  @UseGuards(IzinGuard)
  @ButuhIzin('aset.ubah')
  upsert(@Param('nibar') nibar: string, @Body() dto: UpsertPaktaIntegritasDto) {
    return this.service.upsert(nibar, dto);
  }

  @Delete(':nibar')
  @UseGuards(IzinGuard)
  @ButuhIzin('aset.ubah')
  remove(@Param('nibar') nibar: string) {
    return this.service.remove(nibar);
  }
}
