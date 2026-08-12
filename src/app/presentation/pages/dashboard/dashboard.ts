import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/auth/auth.service';
import { DashboardSuperadminComponent } from './dashboard-superadmin/dashboard-superadmin';
import { DashboardAdminComponent } from './dashboard-admin/dashboard-admin';
import { DashboardPegawaiComponent } from './dashboard-pegawai/dashboard-pegawai';

@Component({
  selector: 'app-dashboard',
  imports: [DashboardSuperadminComponent, DashboardAdminComponent, DashboardPegawaiComponent],
  templateUrl: './dashboard.html',
  standalone: true
})
export class DashboardComponent {
  private authService = inject(AuthService);

  public peran = this.authService.peran;
}
