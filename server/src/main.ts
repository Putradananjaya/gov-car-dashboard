import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json } from 'express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:4300',
    credentials: true
  });
  app.use(cookieParser());
  // Default Express 100kb terlalu kecil untuk foto/dokumen base64 (maks 5MB
  // berkas asli ~ 6.7MB base64) — dipakai LoanDocument & VehiclePhoto.
  app.use(json({ limit: '15mb' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
