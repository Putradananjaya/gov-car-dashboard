import { Body, Controller, Delete, Get, Param, Put, UseGuards } from '@nestjs/common';
import { LoanDocumentService } from './loan-document.service';
import { UpsertLoanDocumentDto } from './dto/upsert-loan-document.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('loan-documents')
@UseGuards(JwtAuthGuard)
export class LoanDocumentController {
  constructor(private readonly service: LoanDocumentService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Put(':id')
  upsert(@Param('id') id: string, @Body() dto: UpsertLoanDocumentDto) {
    return this.service.upsert(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
