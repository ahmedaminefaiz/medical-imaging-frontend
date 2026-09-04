import { Component, OnDestroy, OnInit, inject, input, signal } from '@angular/core';
import { ExamenImage } from '../../models/examen.model';
import { ExamenService } from '../../services/examen.service';

@Component({
  selector: 'app-examen-image-apercu',
  imports: [],
  templateUrl: './examen-image-apercu.html',
})
export class ExamenImageApercu implements OnInit, OnDestroy {
  private readonly examenService = inject(ExamenService);

  readonly examenId = input.required<number>();
  readonly image = input.required<ExamenImage>();

  protected readonly objectUrl = signal<string | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal(false);

  ngOnInit(): void {
    if (!this.image().apercuDisponible) {
      this.loading.set(false);
      return;
    }

    this.examenService.apercu(this.examenId(), this.image().imageId).subscribe({
      next: (blob) => {
        this.objectUrl.set(URL.createObjectURL(blob));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      },
    });
  }

  ngOnDestroy(): void {
    const url = this.objectUrl();
    if (url) {
      URL.revokeObjectURL(url);
    }
  }
}
