import { Directive, Input, TemplateRef, ViewContainerRef, inject, effect, signal } from '@angular/core';
import { PermissionService, Kemampuan } from '../../../core/auth/permission.service';

@Directive({
  selector: '[hasPermission]',
  standalone: true
})
export class HasPermissionDirective {
  private templateRef = inject(TemplateRef<unknown>);
  private viewContainer = inject(ViewContainerRef);
  private permissionService = inject(PermissionService);

  private kemampuanSignal = signal<Kemampuan | null>(null);
  private rendered = false;

  @Input() set hasPermission(value: Kemampuan) {
    this.kemampuanSignal.set(value);
  }

  constructor() {
    effect(() => {
      const kemampuan = this.kemampuanSignal();
      const diizinkan = kemampuan !== null && this.permissionService.can(kemampuan);

      if (diizinkan && !this.rendered) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.rendered = true;
      } else if (!diizinkan && this.rendered) {
        this.viewContainer.clear();
        this.rendered = false;
      }
    });
  }
}
