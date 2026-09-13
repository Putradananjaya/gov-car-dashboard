import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  findAll() {
    return this.service.findAll();
  }

  @Post()
  append(@Body() dto: CreateAuditLogDto) {
    return this.service.append(dto);
  }
}
