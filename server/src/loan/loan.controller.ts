import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { LoanService } from './loan.service';
import { UpsertLoanDto } from './dto/upsert-loan.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

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

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
