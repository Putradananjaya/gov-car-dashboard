import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ServiceRecordService } from './service-record.service';
import { UpsertServiceRecordDto } from './dto/upsert-service-record.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('service-records')
@UseGuards(JwtAuthGuard)
export class ServiceRecordController {
  constructor(private readonly service: ServiceRecordService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('superadmin', 'admin')
  upsert(@Param('id') id: string, @Body() dto: UpsertServiceRecordDto) {
    return this.service.upsert(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
