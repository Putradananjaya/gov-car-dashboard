import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { CarRepository } from '../../../core/repositories/car.repository';
import { Car } from '../../../core/models/car.model';
import { CarFormComponent } from '../../components/car-form/car-form';

@Component({
  selector: 'app-inventory',
  imports: [CommonModule, RouterLink, CarFormComponent],
  templateUrl: './inventory.html',
  standalone: true
})
export class InventoryComponent implements OnInit {
  private carRepository = inject(CarRepository);
  private route = inject(ActivatedRoute);

  // States
  searchQuery = signal<string>('');
  selectedAgency = signal<string>('All');
  selectedStatus = signal<string>('All');
  viewMode = signal<'table' | 'cards'>('table');
  showTaxExpiredOnly = signal<boolean>(false);

  // Modal States
  showFormModal = false;
  selectedCarId: string | null = null;

  // Filter lists
  agencies = [
    'Sekretariat Daerah',
    'Dinas Pekerjaan Umum & Penataan Ruang',
    'Dinas Kesehatan',
    'Dinas Pendidikan, Pemuda & Olahraga',
    'Dinas Perhubungan',
    'Satuan Polisi Pamong Praja',
    'Dinas Sosial',
    'Badan Pengelolaan Keuangan, Pendapatan & Aset Daerah',
    'Kecamatan Bangli',
    'INSPEKTORAT DAERAH'
  ];

  statuses = ['Aktif', 'Digunakan', 'Service', 'Rusak'];

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      const statusParam = params.get('status');
      const filterParam = params.get('filter');
      
      if (statusParam) {
        this.selectedStatus.set(statusParam);
        this.showTaxExpiredOnly.set(false);
      } else if (filterParam === 'pajak-jatuh-tempo') {
        this.showTaxExpiredOnly.set(true);
        this.selectedStatus.set('All');
      } else {
        this.selectedStatus.set('All');
        this.showTaxExpiredOnly.set(false);
      }
      this.selectedAgency.set('All');
    });
  }

  // Filtered Cars computed property
  filteredCars = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const agency = this.selectedAgency();
    const status = this.selectedStatus();
    const taxExpired = this.showTaxExpiredOnly();
    const allCars = this.carRepository.cars();

    return allCars.filter(car => {
      // Filter search
      const matchesSearch = 
        car.plateNumber.toLowerCase().includes(query) ||
        car.model.toLowerCase().includes(query) ||
        car.brand.toLowerCase().includes(query) ||
        car.driverName.toLowerCase().includes(query);

      // Filter instansi
      const matchesAgency = agency === 'All' || car.agency === agency;

      // Filter status
      const matchesStatus = status === 'All' || car.status === status;

      // Filter pajak
      const matchesTax = !taxExpired || !car.stnkActive;

      return matchesSearch && matchesAgency && matchesStatus && matchesTax;
    });
  });

  // Action methods
  onSearchChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  onAgencyFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedAgency.set(select.value);
  }

  onStatusFilterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.selectedStatus.set(select.value);
    this.showTaxExpiredOnly.set(false);
  }

  clearTaxFilter() {
    this.showTaxExpiredOnly.set(false);
  }

  setViewMode(mode: 'table' | 'cards') {
    this.viewMode.set(mode);
  }

  openAddModal() {
    this.selectedCarId = null;
    this.showFormModal = true;
  }

  openEditModal(carId: string) {
    this.selectedCarId = carId;
    this.showFormModal = true;
  }

  closeFormModal() {
    this.showFormModal = false;
    this.selectedCarId = null;
  }

  onFormSaved() {
    this.closeFormModal();
  }

  deleteCar(carId: string) {
    const confirmDelete = confirm('Apakah Anda yakin ingin menghapus data aset mobil dinas ini?');
    if (confirmDelete) {
      this.carRepository.deleteCar(carId);
    }
  }
}
