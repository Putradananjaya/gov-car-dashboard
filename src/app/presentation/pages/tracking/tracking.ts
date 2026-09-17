import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, effect, signal, computed, inject, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import * as L from 'leaflet';
import { CarRepository } from '../../../core/repositories/car.repository';
import { Car } from '../../../core/models/car.model';

/**
 * Kanvas simulasi kendaraan (Car.x/Car.y) berskala 0-800 x 0-500 — dipetakan
 * ke koordinat GPS asli wilayah Kabupaten Bangli supaya peta terlihat nyata
 * (bukan ilustrasi abstrak), tanpa mengubah logika simulasi itu sendiri.
 */
const KANVAS_LEBAR = 800;
const KANVAS_TINGGI = 500;
const BATAS_BANGLI = { utara: -8.2, selatan: -8.52, barat: 115.28, timur: 115.5 };

function xyKeLatLng(x: number, y: number): L.LatLngExpression {
  const lat = BATAS_BANGLI.utara + (y / KANVAS_TINGGI) * (BATAS_BANGLI.selatan - BATAS_BANGLI.utara);
  const lng = BATAS_BANGLI.barat + (x / KANVAS_LEBAR) * (BATAS_BANGLI.timur - BATAS_BANGLI.barat);
  return [lat, lng];
}

interface Landmark {
  lat: number;
  lng: number;
  nama: string;
  warna: string;
}

const LANDMARK_BANGLI: Landmark[] = [
  { lat: -8.2377, lng: 115.3467, nama: 'Kintamani', warna: '#06b6d4' },
  { lat: -8.4515, lng: 115.335, nama: 'Susut', warna: '#8b5cf6' },
  { lat: -8.47, lng: 115.43, nama: 'Tembuku', warna: '#f59e0b' },
  { lat: -8.3742, lng: 115.4517, nama: 'Kawasan Besakih', warna: '#ef4444' },
  { lat: -8.4573, lng: 115.3567, nama: 'Pusat Kota Bangli', warna: '#10b981' }
];

const WARNA_STATUS: Record<Car['status'], string> = {
  Aktif: '#10b981',
  Digunakan: '#38bdf8',
  Service: '#f59e0b',
  Rusak: '#ef4444'
};

@Component({
  selector: 'app-tracking',
  imports: [CommonModule],
  templateUrl: './tracking.html',
  standalone: true
})
export class TrackingComponent implements OnInit, AfterViewInit, OnDestroy {
  private carRepository = inject(CarRepository);
  private route = inject(ActivatedRoute);

  private mapEl = viewChild<ElementRef<HTMLDivElement>>('mapEl');
  private map: L.Map | null = null;
  private markerByCarId = new Map<string, L.Marker>();
  private resizeObserver: ResizeObserver | null = null;

  selectedCarId = signal<string | null>(null);
  filterType = signal<'all' | 'moving' | 'stationary'>('all');

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

  // Sinkron marker kendaraan setiap kali data berubah (posisi/status).
  private syncMarkerEffect = effect(() => {
    const daftarMobil = this.cars();
    if (this.map) this.sinkronMarkerKendaraan(daftarMobil);
  });

  // Fokuskan peta ke kendaraan terpilih.
  private focusEffect = effect(() => {
    const mobil = this.selectedCar();
    const id = this.selectedCarId();
    this.perbaruiFokusMarker(id);
    if (this.map && mobil) {
      const [lat, lng] = xyKeLatLng(mobil.x, mobil.y) as [number, number];
      this.map.flyTo([lat, lng], Math.max(this.map.getZoom(), 14), { duration: 0.6 });
    }
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.selectedCarId.set(id);
      }
    });
  }

  ngAfterViewInit(): void {
    const container = this.mapEl()?.nativeElement;
    if (!container) return;

    // Kontainer flex/grid ini baru mencapai ukuran akhirnya setelah satu siklus
    // layout browser — menunda inisialisasi Leaflet ke requestAnimationFrame
    // mencegah peta "mengukur" dirinya sendiri saat masih berukuran sementara
    // (yang menyebabkan sebagian ubin peta salah posisi/tidak termuat).
    requestAnimationFrame(() => this.inisialisasiPeta(container));
  }

  private inisialisasiPeta(container: HTMLDivElement): void {
    const pusat = xyKeLatLng(KANVAS_LEBAR / 2, KANVAS_TINGGI / 2);
    this.map = L.map(container, {
      center: pusat,
      zoom: 12,
      zoomControl: true,
      attributionControl: true
    });

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    for (const landmark of LANDMARK_BANGLI) {
      L.marker([landmark.lat, landmark.lng], { icon: this.ikonLandmark(landmark), interactive: false }).addTo(this.map);
    }

    this.sinkronMarkerKendaraan(this.cars());
    this.map.invalidateSize();

    // Tetap pasang ResizeObserver untuk perubahan ukuran berikutnya (mis. toggle
    // sidebar, resize jendela) — bukan lagi untuk mengoreksi ukuran awal.
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
    this.resizeObserver.observe(container);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
    this.map = null;
  }

  private ikonLandmark(landmark: Landmark): L.DivIcon {
    return L.divIcon({
      className: '',
      html: `<div class="tracking-landmark-pin"><span class="pin-dot" style="background:${landmark.warna}"></span><span class="pin-label">${landmark.nama}</span></div>`,
      // Lebar cukup untuk label terpanjang ("Kawasan Besakih") agar tidak terpotong/kolaps.
      iconSize: [160, 40],
      iconAnchor: [80, 6]
    });
  }

  private ikonKendaraan(car: Car, terfokus: boolean): L.DivIcon {
    const warna = WARNA_STATUS[car.status];
    const pulse = car.status === 'Digunakan' || car.status === 'Rusak'
      ? `<span class="marker-pulse" style="background:${warna}"></span>`
      : '';
    return L.divIcon({
      className: `tracking-vehicle-marker${terfokus ? ' is-focused' : ''}`,
      html: `
        <div class="marker-plate-label">${car.plateNumber}</div>
        <div class="marker-dot-wrapper">
          ${pulse}
          <span class="marker-dot" style="background:${warna}"></span>
        </div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11]
    });
  }

  private sinkronMarkerKendaraan(daftarMobil: Car[]): void {
    if (!this.map) return;
    const idAktif = new Set(daftarMobil.map(c => c.id));

    for (const [id, marker] of this.markerByCarId) {
      if (!idAktif.has(id)) {
        marker.remove();
        this.markerByCarId.delete(id);
      }
    }

    for (const car of daftarMobil) {
      const posisi = xyKeLatLng(car.x, car.y);
      const terfokus = this.selectedCarId() === car.id;
      const existing = this.markerByCarId.get(car.id);

      if (existing) {
        existing.setLatLng(posisi);
        existing.setIcon(this.ikonKendaraan(car, terfokus));
      } else {
        const marker = L.marker(posisi, { icon: this.ikonKendaraan(car, terfokus) })
          .addTo(this.map)
          .on('click', () => this.selectCar(car.id));
        this.markerByCarId.set(car.id, marker);
      }
    }
  }

  private perbaruiFokusMarker(idTerfokus: string | null): void {
    for (const [id, marker] of this.markerByCarId) {
      const car = this.cars().find(c => c.id === id);
      if (car) marker.setIcon(this.ikonKendaraan(car, id === idTerfokus));
    }
  }

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
