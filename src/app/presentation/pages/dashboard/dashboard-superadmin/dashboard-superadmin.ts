import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VehicleAssetRepository } from '../../../../core/repositories/vehicle-asset.repository';
import { VehicleOperationalRepository } from '../../../../core/repositories/vehicle-operational.repository';
import { LoanRepository } from '../../../../core/repositories/loan.repository';
import { AuditRepository } from '../../../../core/repositories/audit.repository';
import { UserRepository } from '../../../../core/repositories/user.repository';
import { CarRepository } from '../../../../core/repositories/car.repository';

const STATUS_COLORS: Record<string, string> = {
  Tersedia: '#10b981',
  Dipinjam: '#f59e0b',
  Servis: '#8b5cf6',
  'Tidak Layak': '#ef4444'
};

@Component({
  selector: 'app-dashboard-superadmin',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-superadmin.html',
  standalone: true
})
export class DashboardSuperadminComponent {
  private assetRepository = inject(VehicleAssetRepository);
  private operationalRepository = inject(VehicleOperationalRepository);
  private loanRepository = inject(LoanRepository);
  private auditRepository = inject(AuditRepository);
  private userRepository = inject(UserRepository);
  private carRepository = inject(CarRepository);

  // Panel peta ilustratif memang masih memakai CarRepository lama (Fase 2) —
  // tracking/GPS di luar cakupan putaran ini.
  public miniMapCars = computed(() => this.carRepository.cars().filter(c => c.status === 'Digunakan').slice(0, 4));

  private activeAssets = computed(() => this.assetRepository.assets().filter(a => !a.dihapusPada));

  public totalAset = computed(() => this.activeAssets().length);
  public totalNilaiAset = computed(() => this.activeAssets().reduce((sum, a) => sum + a.nilaiPerolehan, 0));
  public penggunaAktif = computed(() => this.userRepository.users().filter(u => u.aktif).length);

  public aktivitas24Jam = computed(() => {
    const batas = Date.now() - 24 * 60 * 60 * 1000;
    return this.auditRepository.entries().filter(e => new Date(e.waktu).getTime() >= batas).length;
  });

  public asetPerOpd = computed(() => {
    const counts = new Map<string, number>();
    for (const asset of this.activeAssets()) {
      const opd = asset.statusPenggunaan || '(Tanpa OPD)';
      counts.set(opd, (counts.get(opd) ?? 0) + 1);
    }
    return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  });

  public barChartData = computed(() => {
    const data = this.asetPerOpd();
    const width = 450;
    const height = 220;
    const paddingLeft = 40;
    const paddingBottom = 40;
    const paddingTop = 15;
    const maxCount = Math.max(1, ...data.map(d => d.count));
    const barWidth = 36;
    const gap = 16;

    const bars = data.map((d, index) => {
      const x = paddingLeft + index * (barWidth + gap);
      const barHeight = (d.count / maxCount) * (height - paddingBottom - paddingTop);
      const y = height - paddingBottom - barHeight;
      return { ...d, x, y, width: barWidth, height: barHeight };
    });

    return { bars, width, height, paddingLeft, paddingBottom };
  });

  public statusDistribution = computed(() => {
    const counts = new Map<string, number>();
    for (const op of this.operationalRepository.operational()) {
      counts.set(op.status, (counts.get(op.status) ?? 0) + 1);
    }
    const total = [...counts.values()].reduce((a, b) => a + b, 0) || 1;

    let accumulatedAngle = 0;
    const radius = 70;
    const cx = 100;
    const cy = 100;

    return [...counts.entries()].map(([label, count]) => {
      const percentage = Math.round((count / total) * 100);
      const angle = (count / total) * 360;
      const startAngle = accumulatedAngle;
      accumulatedAngle += angle;

      const x1 = cx + radius * Math.cos((startAngle - 90) * Math.PI / 180);
      const y1 = cy + radius * Math.sin((startAngle - 90) * Math.PI / 180);
      const x2 = cx + radius * Math.cos((accumulatedAngle - 90) * Math.PI / 180);
      const y2 = cy + radius * Math.sin((accumulatedAngle - 90) * Math.PI / 180);
      const largeArcFlag = angle > 180 ? 1 : 0;

      return {
        label,
        count,
        percentage,
        color: STATUS_COLORS[label] ?? '#64748b',
        isFull: percentage === 100,
        pathData: `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`
      };
    });
  });

  public loansTerbaru = computed(() =>
    this.loanRepository.loans().slice().sort((a, b) => b.rencanaMulai.localeCompare(a.rencanaMulai)).slice(0, 5)
  );

  public aktivitasTerbaru = computed(() =>
    this.auditRepository.entries().slice().sort((a, b) => b.waktu.localeCompare(a.waktu)).slice(0, 6)
  );

  vehicleLabel(nibar: string): string {
    const asset = this.assetRepository.findByNibar(nibar);
    return asset ? `${asset.merek} ${asset.tipe} — ${asset.nomorPolisi}` : nibar;
  }
}
