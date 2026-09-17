import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { LoanService } from './loan.service';
import { UpsertLoanDto } from './dto/upsert-loan.dto';
import { SerahTerimaLoanDto } from './dto/serah-terima.dto';
import { TolakLoanDto } from './dto/tolak-loan.dto';
import { KembalikanLoanDto } from './dto/kembalikan-loan.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
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

  @Post(':id/setujui-tahap1')
  @UseGuards(RolesGuard)
  @Roles('superadmin', 'admin')
  setujuiTahap1(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.service.setujuiTahap1(id, req.user.sub);
  }

  @Post(':id/serah-terima')
  @UseGuards(RolesGuard)
  @Roles('superadmin', 'pejabat_penatausahaan')
  serahTerima(@Param('id') id: string, @Body() dto: SerahTerimaLoanDto, @Req() req: RequestWithUser) {
    return this.service.serahTerima(id, dto, req.user.sub);
  }

  @Post(':id/tolak')
  @UseGuards(RolesGuard)
  @Roles('superadmin', 'admin', 'pejabat_penatausahaan')
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
