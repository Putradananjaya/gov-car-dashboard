import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IzinGuard } from '../auth/izin.guard';
import { ButuhIzin } from '../auth/izin.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  @UseGuards(IzinGuard)
  @ButuhIzin('audit.lihat')
  findAll() {
    return this.service.findAll();
  }

  @Post()
  append(@Body() dto: CreateAuditLogDto) {
    return this.service.append(dto);
  }
}
