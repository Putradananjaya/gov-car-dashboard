import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IzinGuard } from '../auth/izin.guard';
import { ButuhIzin } from '../auth/izin.decorator';
import { JwtPayload } from '../auth/jwt.strategy';

type RequestWithUser = Request & { user: JwtPayload };

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly service: UserService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  /**
   * Arsip akun terhapus. Rutenya statis dan harus dideklarasikan sebelum
   * `@Get(':id')` kalau kelak rute itu ditambahkan — Nest mencocokkan rute
   * sesuai urutan deklarasi.
   */
  @Get('terhapus')
  @UseGuards(IzinGuard)
  @ButuhIzin('pengguna.hapus')
  findTerhapus() {
    return this.service.findTerhapus();
  }

  @Post()
  @UseGuards(IzinGuard)
  @ButuhIzin('pengguna.kelola')
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @UseGuards(IzinGuard)
  @ButuhIzin('pengguna.kelola')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  /** Soft delete — lihat `UserService.softDelete`. */
  @Delete(':id')
  @UseGuards(IzinGuard)
  @ButuhIzin('pengguna.hapus')
  remove(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.softDelete(id, req.user.sub);
  }

  @Post(':id/pulihkan')
  @UseGuards(IzinGuard)
  @ButuhIzin('pengguna.hapus')
  restore(@Param('id') id: string) {
    return this.service.restore(id);
  }

  @Post(':id/reset-password')
  @UseGuards(IzinGuard)
  @ButuhIzin('pengguna.kelola')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto, @Req() req: RequestWithUser) {
    return this.service.resetPassword(id, dto, req.user.sub);
  }
}
