import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { CarRepository } from './core/repositories/car.repository';
import { LocalCarRepository } from './data/repositories/local-car.repository';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: CarRepository, useClass: LocalCarRepository }
  ]
};
