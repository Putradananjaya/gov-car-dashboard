import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IZIN_KEY } from './izin.decorator';
import { JwtPayload } from './jwt.strategy';
import { RolePermissionService } from '../role-permission/role-permission.service';
import type { Kemampuan } from '../role-permission/kemampuan';

@Injectable()
export class IzinGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rolePermissionService: RolePermissionService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const dibutuhkan = this.reflector.getAllAndOverride<Kemampuan[] | undefined>(IZIN_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!dibutuhkan || dibutuhkan.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const boleh = await this.rolePermissionService.boleh(request.user?.peran, dibutuhkan);
    if (!boleh) {
      throw new ForbiddenException('Anda tidak memiliki izin untuk tindakan ini.');
    }
    return true;
  }
}
