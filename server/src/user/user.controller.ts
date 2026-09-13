import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly service: UserService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/reset-password')
  @UseGuards(RolesGuard)
  @Roles('superadmin')
  resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) {
    return this.service.resetPassword(id, dto);
  }
}
