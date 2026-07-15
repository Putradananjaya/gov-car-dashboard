import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { CarRepository } from '../../../core/repositories/car.repository';
import { Car } from '../../../core/models/car.model';

@Component({
  selector: 'app-tracking',
  imports: [CommonModule],
  templateUrl: './tracking.html',
  standalone: true
})
export class TrackingComponent implements OnInit {
  private carRepository = inject(CarRepository);
  private route = inject(ActivatedRoute);

  selectedCarId = signal<string | null>(null);
  filterType = signal<'all' | 'moving' | 'stationary'>('all');

  // Landmark wilayah Kabupaten Bangli kustom
  landmarks = [
    { x: 400, y: 80, name: 'Kintamani', color: '#06b6d4' },
    { x: 120, y: 350, name: 'Susut', color: '#8b5cf6' },
    { x: 720, y: 260, name: 'Tembuku', color: '#f59e0b' },
    { x: 750, y: 120, name: 'Kawasan Besakih', color: '#ef4444' },
    { x: 400, y: 230, name: 'Pusat Kota Bangli', color: '#10b981' }
  ];

  // Rute jalan Kabupaten Bangli kustom
  roadPaths = [
    'M 120 350 L 300 350 L 400 230 L 550 280',
    'M 400 80 L 400 230 L 550 280 L 700 420',
    'M 720 260 L 550 280 L 400 230 L 300 350',
    'M 750 120 L 550 280 L 400 230 L 120 350'
  ];

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.selectedCarId.set(id);
      }
    });
  }

  cars = computed(() => this.carRepository.cars());

  sidebarCars = computed(() => {
    const list = this.cars();
    const filter = this.filterType();

    if (filter === 'moving') {
      return list.filter(c => c.status === 'Digunakan');
    } else if (filter === 'stationary') {
      return list.filter(c => c.status !== 'Digunakan');
    }
    return list;
  });

  selectedCar = computed(() => {
    const id = this.selectedCarId();
    if (!id) return null;
    return this.cars().find(c => c.id === id) || null;
  });

  selectCar(id: string) {
    this.selectedCarId.set(id);
  }

  clearSelection() {
    this.selectedCarId.set(null);
  }

  setFilter(type: 'all' | 'moving' | 'stationary') {
    this.filterType.set(type);
  }

  quickUpdateStatus(carId: string, event: Event) {
    const select = event.target as HTMLSelectElement;
    this.carRepository.updateCar(carId, { status: select.value as any });
  }

  callDriver(phone: string, name: string) {
    alert(`Menghubungi nomor telepon dinas driver ${name}: ${phone} (Panggilan suara disimulasikan...)`);
  }
}
