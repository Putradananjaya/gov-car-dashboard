import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AssetFormComponent } from '../../../components/asset-form/asset-form';

@Component({
  selector: 'app-aset-baru',
  imports: [AssetFormComponent],
  templateUrl: './aset-baru.html',
  standalone: true
})
export class AsetBaruComponent {
  private router = inject(Router);

  onSaved(nibar: string): void {
    this.router.navigate(['/app/aset', nibar]);
  }

  onCancelled(): void {
    this.router.navigate(['/app/aset']);
  }
}
