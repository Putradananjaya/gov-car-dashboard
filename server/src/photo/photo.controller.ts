import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { PhotoService } from './photo.service';
import { UpsertVehiclePhotoDto } from './dto/upsert-vehicle-photo.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IzinGuard } from '../auth/izin.guard';
import { ButuhIzin } from '../auth/izin.decorator';

@Controller('photos')
@UseGuards(JwtAuthGuard)
export class PhotoController {
  constructor(private readonly service: PhotoService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Put(':nibar')
  @UseGuards(IzinGuard)
  @ButuhIzin('aset.ubah', 'aset.impor')
  upsert(@Param('nibar') nibar: string, @Body() dto: UpsertVehiclePhotoDto) {
    return this.service.upsert(nibar, dto);
  }

  @Delete(':nibar')
  @UseGuards(IzinGuard)
  @ButuhIzin('aset.ubah', 'aset.impor')
  remove(@Param('nibar') nibar: string) {
    return this.service.remove(nibar);
  }
}
