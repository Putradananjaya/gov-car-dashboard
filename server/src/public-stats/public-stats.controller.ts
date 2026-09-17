import { Controller, Get } from '@nestjs/common';
import { PublicStatsService } from './public-stats.service';

/** Statistik agregat publik untuk halaman landing — sengaja TANPA JwtAuthGuard (diakses sebelum login). */
@Controller('public-stats')
export class PublicStatsController {
  constructor(private readonly service: PublicStatsService) {}

  @Get()
  getStats() {
    return this.service.getStats();
  }
}
