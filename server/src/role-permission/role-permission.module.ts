import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolePermissionEntity } from './role-permission.entity';
import { RolePermissionService } from './role-permission.service';
import { RolePermissionController } from './role-permission.controller';

/**
 * Global karena IzinGuard dipasang di banyak controller lintas modul dan
 * membutuhkan RolePermissionService — tanpa ini setiap modul harus
 * mengimpornya satu per satu.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([RolePermissionEntity])],
  controllers: [RolePermissionController],
  providers: [RolePermissionService],
  exports: [RolePermissionService]
})
export class RolePermissionModule {}
