import { SetMetadata } from '@nestjs/common';
import { Peran } from '../user/user.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Peran[]) => SetMetadata(ROLES_KEY, roles);
