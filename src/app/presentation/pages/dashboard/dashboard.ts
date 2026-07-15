import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CarRepository } from '../../../core/repositories/car.repository';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  standalone: true
})
export class DashboardComponent {
  private carRepository = inject(CarRepository);

  selectedJadwalTab = signal<'servis' | 'pajak'>('servis');

  recentLogs = computed(() => this.carRepository.logs().slice(0, 5));

  totalCars = computed(() => this.carRepository.cars().length);
  
  availableCars = computed(() => 
    this.carRepository.cars().filter(c => c.status === 'Aktif').length
  );
  
  borrowedCars = computed(() => 
    this.carRepository.cars().filter(c => c.status === 'Digunakan').length
  );
  
  maintenanceCars = computed(() => 
    this.carRepository.cars().filter(c => c.status === 'Service').length
  );

  taxExpiredCars = computed(() => 
    this.carRepository.cars().filter(c => !c.stnkActive).length
  );

  stnkActiveCars = computed(() => 
    this.carRepository.cars().filter(c => c.stnkActive).length
  );

  availablePercent = computed(() => Math.round((this.availableCars() / this.totalCars()) * 100));
  borrowedPercent = computed(() => Math.round((this.borrowedCars() / this.totalCars()) * 100));
  maintenancePercent = computed(() => Math.round((this.maintenanceCars() / this.totalCars()) * 100));
  taxExpiredPercent = computed(() => (this.taxExpiredCars() / this.totalCars() * 100).toFixed(2));
  stnkActivePercent = computed(() => (this.stnkActiveCars() / this.totalCars() * 100).toFixed(2));

  miniMapCars = computed(() => 
    this.carRepository.cars().filter(c => c.status === 'Digunakan').slice(0, 4)
  );

  statusDistribution = computed(() => {
    const total = this.availableCars() + this.borrowedCars() + this.maintenanceCars() || 1;
    const data = [
      { label: 'Tersedia', count: this.availableCars(), color: '#10b981' },
      { label: 'Dipinjam', count: this.borrowedCars(), color: '#f59e0b' },
      { label: 'Pemeliharaan', count: this.maintenanceCars(), color: '#8b5cf6' }
    ];

    let accumulatedAngle = 0;
    const radius = 70;
    const cx = 100;
    const cy = 100;

    return data.map(item => {
      const percentage = Math.round((item.count / total) * 100);
      const angle = (item.count / total) * 360;
      const startAngle = accumulatedAngle;
      accumulatedAngle += angle;

      const x1 = cx + radius * Math.cos((startAngle - 90) * Math.PI / 180);
      const y1 = cy + radius * Math.sin((startAngle - 90) * Math.PI / 180);
      const x2 = cx + radius * Math.cos((accumulatedAngle - 90) * Math.PI / 180);
      const y2 = cy + radius * Math.sin((accumulatedAngle - 90) * Math.PI / 180);
      
      const largeArcFlag = angle > 180 ? 1 : 0;
      const pathData = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`;

      return {
        ...item,
        percentage,
        pathData,
        isFull: percentage === 100
      };
    });
  });

  opdUsageData = [
    { name: 'Setda', count: 42 },
    { name: 'Dinas PUPR', count: 38 },
    { name: 'Dinas Kesehatan', count: 28 },
    { name: 'Dinas Pendidikan', count: 26 },
    { name: 'Dishub', count: 22 },
    { name: 'Satpol PP', count: 18 },
    { name: 'Dinas Sosial', count: 16 },
    { name: 'BPKPD', count: 14 },
    { name: 'Kec. Bangli', count: 12 }
  ];

  barChartData = computed(() => {
    const width = 450;
    const height = 200;
    const paddingLeft = 40;
    const paddingBottom = 30;
    const paddingTop = 15;

    const maxCount = 50;
    const barWidth = 24;
    const gap = 16;

    const bars = this.opdUsageData.map((opd, index) => {
      const x = paddingLeft + index * (barWidth + gap);
      const barHeight = (opd.count / maxCount) * (height - paddingBottom - paddingTop);
      const y = height - paddingBottom - barHeight;
      return {
        ...opd,
        x,
        y,
        width: barWidth,
        height: barHeight
      };
    });

    const yGridLines = [10, 20, 30, 40, 50].map(val => {
      const y = height - paddingBottom - (val / maxCount) * (height - paddingBottom - paddingTop);
      return { y, val };
    });

    return {
      bars,
      yGridLines,
      width,
      height,
      paddingLeft,
      paddingBottom
    };
  });

  monthlyTrends = [
    { month: 'Jan', count: 65 },
    { month: 'Feb', count: 72 },
    { month: 'Mar', count: 68 },
    { month: 'Apr', count: 85 },
    { month: 'Mei', count: 87 },
    { month: 'Jun', count: 78 },
    { month: 'Jul', count: 74 },
    { month: 'Agt', count: 82 },
    { month: 'Sep', count: 77 },
    { month: 'Okt', count: 73 },
    { month: 'Nov', count: 69 },
    { month: 'Des', count: 64 }
  ];

  lineChartPoints = computed(() => {
    const data = this.monthlyTrends;
    const width = 450;
    const height = 200;
    const paddingLeft = 30;
    const paddingRight = 15;
    const paddingBottom = 30;
    const paddingTop = 15;
    
    const maxCount = 100;
    const pointCount = data.length;

    const points = data.map((item, index) => {
      const x = paddingLeft + (index * (width - paddingLeft - paddingRight) / (pointCount - 1));
      const y = height - paddingBottom - (item.count / maxCount) * (height - paddingBottom - paddingTop);
      return { x: Math.round(x), y: Math.round(y), val: item.count, label: item.month };
    });

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaData = `${pathData} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

    const yGridLines = [25, 50, 75, 100].map(val => {
      const y = height - paddingBottom - (val / maxCount) * (height - paddingBottom - paddingTop);
      return { y, val };
    });

    return {
      points,
      pathData,
      areaData,
      yGridLines,
      width,
      height,
      paddingLeft,
      paddingBottom
    };
  });

  jadwalServis = [
    { type: 'Servis', plate: 'DK 1111 AA', model: 'Toyota Fortuner', date: '28 Mei 2025', due: '2 hari lagi', info: 'Servis Berkala' },
    { type: 'Servis', plate: 'DK 2222 BB', model: 'Mitsubishi L300', date: '31 Mei 2025', due: '5 hari lagi', info: 'Servis Berkala' },
    { type: 'Servis', plate: 'DK 3333 CC', model: 'Toyota Innova', date: '03 Jun 2025', due: '8 hari lagi', info: 'Servis Berkala' }
  ];

  jadwalPajak = [
    { type: 'Pajak', plate: 'DK 4444 DD', model: 'Honda Brio', date: '30 Mei 2025', due: '4 hari lagi', info: 'Pajak Tahunan' },
    { type: 'Pajak', plate: 'DK 5555 EE', model: 'Daihatsu Xenia', date: '02 Jun 2025', due: '7 hari lagi', info: 'Pajak Tahunan' }
  ];

  notifications = [
    { icon: 'tool', title: 'Pengingat Servis', desc: 'Toyota Fortuner DK 1111 AA jadwal servis 28 Mei 2025', time: '2 jam lalu', urgent: true },
    { icon: 'file', title: 'Pajak Jatuh Tempo', desc: 'Mitsubishi Pajero DK 5678 CD jatuh tempo 30 Mei 2025', time: '3 jam lalu', urgent: true },
    { icon: 'return', title: 'Pengembalian Kendaraan', desc: 'Mitsubishi Pajero DK 5678 CD seharusnya kembali hari ini', time: '4 jam lalu', urgent: true },
    { icon: 'done', title: 'Servis Selesai', desc: 'Toyota Avanza DK 6666 FF servis telah selesai', time: 'Kemarin', urgent: false },
    { icon: 'warn', title: 'STNK Akan Habis', desc: 'Toyota Innova DK 3333 CC STNK berakhir 15 Jun 2025', time: 'Kemarin', urgent: false }
  ];

  setTab(tab: 'servis' | 'pajak') {
    this.selectedJadwalTab.set(tab);
  }
}
