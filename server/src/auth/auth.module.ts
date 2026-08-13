import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { RefreshTokenEntity } from './refresh-token.entity';
import { LoginAttemptEntity } from './login-attempt.entity';
import { UserEntity } from '../user/user.entity';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([UserEntity, RefreshTokenEntity, LoginAttemptEntity]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-only-insecure-secret'),
        // `expiresIn` mengharapkan tipe literal ms (mis. '15m'), bukan `string`
        // umum — env var selalu string biasa, jadi perlu type assertion di sini.
        signOptions: { expiresIn: config.get<string>('JWT_ACCESS_TTL', '15m') as `${number}m` }
      })
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService]
})
export class AuthModule {}
