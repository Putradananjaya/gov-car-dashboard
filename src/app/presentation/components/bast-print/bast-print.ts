import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VehicleAssetRepository } from '../../../core/repositories/vehicle-asset.repository';
import { Loan } from '../../../core/models/loan.model';

export type BastMode = 'serah' | 'kembali';

@Component({
  selector: 'app-bast-print',
  imports: [CommonModule],
  templateUrl: './bast-print.html',
  standalone: true
})
export class BastPrintComponent {
  private assetRepository = inject(VehicleAssetRepository);

  @Input({ required: true }) loan!: Loan;
  @Input({ required: true }) mode!: BastMode;
  @Output() closed = new EventEmitter<void>();

  vehicleLabel(nibar: string): string {
    const asset = this.assetRepository.findByNibar(nibar);
    return asset ? `${asset.merek} ${asset.tipe} — ${asset.nomorPolisi}` : nibar;
  }

  onClose(): void {
    this.closed.emit();
  }

  onPrint(): void {
    window.print();
  }
}
