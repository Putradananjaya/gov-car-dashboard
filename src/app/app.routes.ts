import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./presentation/pages/landing/landing').then(m => m.LandingComponent)
  },
  {
    path: 'masuk',
    loadComponent: () => import('./presentation/pages/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'app',
    canActivate: [authGuard],
    children: [
      {
        path: 'beranda',
        loadComponent: () => import('./presentation/pages/dashboard/dashboard').then(m => m.DashboardComponent)
      },
      {
        path: 'aset',
        canActivate: [roleGuard],
        data: { peran: ['superadmin', 'admin'] },
        loadComponent: () => import('./presentation/pages/aset/aset-list/aset-list').then(m => m.AsetListComponent)
      },
      {
        path: 'aset/baru',
        canActivate: [roleGuard],
        data: { peran: ['superadmin', 'admin'] },
        loadComponent: () => import('./presentation/pages/aset/aset-baru/aset-baru').then(m => m.AsetBaruComponent)
      },
      {
        path: 'aset/impor',
        canActivate: [roleGuard],
        data: { peran: ['superadmin', 'admin'] },
        loadComponent: () => import('./presentation/pages/aset/aset-impor/aset-impor').then(m => m.AsetImporComponent)
      },
      {
        path: 'aset/:nibar',
        canActivate: [roleGuard],
        data: { peran: ['superadmin', 'admin'] },
        loadComponent: () => import('./presentation/pages/aset/aset-detail/aset-detail').then(m => m.AsetDetailComponent)
      },
      {
        path: 'inventory',
        canActivate: [roleGuard],
        data: { peran: ['superadmin', 'admin'] },
        loadComponent: () => import('./presentation/pages/inventory/inventory').then(m => m.InventoryComponent)
      },
      {
        path: 'tracking',
        canActivate: [roleGuard],
        data: { peran: ['superadmin', 'admin'] },
        loadComponent: () => import('./presentation/pages/tracking/tracking').then(m => m.TrackingComponent)
      },
      {
        path: 'tracking/:id',
        canActivate: [roleGuard],
        data: { peran: ['superadmin', 'admin'] },
        loadComponent: () => import('./presentation/pages/tracking/tracking').then(m => m.TrackingComponent)
      },
      {
        path: 'peminjaman',
        loadComponent: () => import('./presentation/pages/peminjaman/peminjaman').then(m => m.PeminjamanComponent)
      },
      {
        path: 'peminjaman/persetujuan',
        canActivate: [roleGuard],
        data: { peran: ['superadmin', 'admin'] },
        loadComponent: () => import('./presentation/pages/peminjaman/persetujuan/persetujuan').then(m => m.PersetujuanComponent)
      },
      {
        path: 'pengguna',
        canActivate: [roleGuard],
        data: { peran: ['superadmin'] },
        loadComponent: () => import('./presentation/pages/pengguna/pengguna-list/pengguna-list').then(m => m.PenggunaListComponent)
      },
      {
        path: 'audit',
        canActivate: [roleGuard],
        data: { peran: ['superadmin'] },
        loadComponent: () => import('./presentation/pages/audit/audit-list/audit-list').then(m => m.AuditListComponent)
      },
      {
        path: '',
        redirectTo: 'beranda',
        pathMatch: 'full'
      }
    ]
  },
  // Rute lama dipertahankan sebagai redirect agar tautan/bookmark lama tidak rusak.
  { path: 'login', redirectTo: 'masuk' },
  { path: 'dashboard', redirectTo: 'app/beranda' },
  { path: 'inventory', redirectTo: 'app/inventory' },
  { path: 'tracking', redirectTo: 'app/tracking' },
  { path: 'tracking/:id', redirectTo: 'app/tracking/:id' },
  {
    path: '**',
    redirectTo: ''
  }
];
