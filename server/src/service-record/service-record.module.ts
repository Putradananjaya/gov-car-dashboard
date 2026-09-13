import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceRecordEntity } from './service-record.entity';
import { ServiceRecordService } from './service-record.service';
import { ServiceRecordController } from './service-record.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceRecordEntity])],
  controllers: [ServiceRecordController],
  providers: [ServiceRecordService]
})
export class ServiceRecordModule {}
