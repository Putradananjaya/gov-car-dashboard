import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { LoanService } from './loan.service';
import { UpsertLoanDto } from './dto/upsert-loan.dto';
import { SerahTerimaLoanDto } from './dto/serah-terima.dto';
import { TolakLoanDto } from './dto/tolak-loan.dto';
import { KembalikanLoanDto } from './dto/kembalikan-loan.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IzinGuard } from '../auth/izin.guard';
import { ButuhIzin } from '../auth/izin.decorator';
import { JwtPayload } from '../auth/jwt.strategy';

type RequestWithUser = Request & { user: JwtPayload };

@Controller('loans')
@UseGuards(JwtAuthGuard)
export class LoanController {
  constructor(private readonly service: LoanService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  upsert(@Param('id') id: string, @Body() dto: UpsertLoanDto) {
    return this.service.upsert(id, dto);
  }

  /** Langkah 2 SOP — Pengurus Barang menyatakan kendaraan tersedia. */
  @Post(':id/verifikasi')
  @UseGuards(IzinGuard)
  @ButuhIzin('peminjaman.verifikasi')
  verifikasi(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.verifikasi(id, req.user.sub);
  }

  /** Langkah 3 SOP — persetujuan oleh Pejabat Penatausahaan Pengguna Barang. */
  @Post(':id/setujui')
  @UseGuards(IzinGuard)
  @ButuhIzin('peminjaman.setujui')
  setujui(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.setujui(id, req.user.sub);
  }

  @Post(':id/serah-terima')
  @UseGuards(IzinGuard)
  @ButuhIzin('peminjaman.serahTerima')
  serahTerima(@Param('id') id: string, @Body() dto: SerahTerimaLoanDto, @Req() req: RequestWithUser) {
    return this.service.serahTerima(id, dto, req.user.sub);
  }

  @Post(':id/tolak')
  @UseGuards(IzinGuard)
  @ButuhIzin('peminjaman.verifikasi', 'peminjaman.setujui')
  tolak(@Param('id') id: string, @Body() dto: TolakLoanDto) {
    return this.service.tolak(id, dto);
  }

  @Post(':id/kembalikan')
  kembalikan(@Param('id') id: string, @Body() dto: KembalikanLoanDto, @Req() req: RequestWithUser) {
    return this.service.kembalikan(id, dto, req.user.sub, req.user.peran);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
