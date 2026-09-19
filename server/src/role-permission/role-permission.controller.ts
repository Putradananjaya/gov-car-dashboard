import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { RolePermissionService } from './role-permission.service';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IzinGuard } from '../auth/izin.guard';
import { ButuhIzin } from '../auth/izin.decorator';

@Controller('role-permissions')
@UseGuards(JwtAuthGuard)
export class RolePermissionController {
  constructor(private readonly service: RolePermissionService) {}

  /**
   * Dibuka untuk semua pengguna yang sudah masuk — setiap sesi perlu tahu
   * matriksnya untuk menentukan menu dan tombol mana yang ditampilkan.
   * Isinya bukan data sensitif, hanya aturan siapa boleh apa.
   */
  @Get()
  getMatriks() {
    return this.service.getMatriks();
  }

  @Put()
  @UseGuards(IzinGuard)
  @ButuhIzin('pengguna.kelola')
  simpan(@Body() dto: UpdateRolePermissionDto) {
    return this.service.simpan(dto.matriks);
  }
}
