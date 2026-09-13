import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclePhotoEntity } from './vehicle-photo.entity';
import { PhotoService } from './photo.service';
import { PhotoController } from './photo.controller';

@Module({
  imports: [TypeOrmModule.forFeature([VehiclePhotoEntity])],
  controllers: [PhotoController],
  providers: [PhotoService]
})
export class PhotoModule {}
