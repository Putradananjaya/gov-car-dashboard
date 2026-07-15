import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./presentation/pages/landing/landing').then(m => m.LandingComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./presentation/pages/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./presentation/pages/dashboard/dashboard').then(m => m.DashboardComponent)
  },
  {
    path: 'inventory',
    loadComponent: () => import('./presentation/pages/inventory/inventory').then(m => m.InventoryComponent)
  },
  {
    path: 'tracking',
    loadComponent: () => import('./presentation/pages/tracking/tracking').then(m => m.TrackingComponent)
  },
  {
    path: 'tracking/:id',
    loadComponent: () => import('./presentation/pages/tracking/tracking').then(m => m.TrackingComponent)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
