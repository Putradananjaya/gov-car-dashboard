import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoanEntity } from './loan.entity';
import { LoanDocumentEntity } from './loan-document.entity';
import { LoanService } from './loan.service';
import { LoanDocumentService } from './loan-document.service';
import { LoanController } from './loan.controller';
import { LoanDocumentController } from './loan-document.controller';
import { UserEntity } from '../user/user.entity';
import { VehicleOperationalEntity } from '../vehicle-operational/vehicle-operational.entity';

@Module({
  imports: [TypeOrmModule.forFeature([LoanEntity, LoanDocumentEntity, UserEntity, VehicleOperationalEntity])],
  controllers: [LoanController, LoanDocumentController],
  providers: [LoanService, LoanDocumentService]
})
export class LoanModule {}
