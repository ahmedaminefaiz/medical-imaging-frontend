import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ExamenDetail as ExamenDetailModel } from '../../models/examen.model';
import { ExamenImageApercuStore } from '../../services/examen-image-apercu-store.service';
import { ExamenService } from '../../services/examen.service';
import { ExamenImageApercu } from './examen-image-apercu';
import { ExamenImageViewer } from './examen-image-viewer';

@Component({
  selector: 'app-examen-detail',
  imports: [DatePipe, ExamenImageApercu, ExamenImageViewer],
  templateUrl: './examen-detail.html',
})
export class ExamenDetail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly examenService = inject(ExamenService);
  private readonly apercuStore = inject(ExamenImageApercuStore);

  private readonly examenId: number;

  protected readonly examen = signal<ExamenDetailModel | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<'not-found' | 'generic' | null>(null);
  protected readonly imageOuverteIndex = signal<number | null>(null);

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.examenId = idParam !== null ? Number(idParam) : NaN;
  }

  ngOnInit(): void {
    if (Number.isNaN(this.examenId)) {
      this.error.set('not-found');
      this.loading.set(false);
      return;
    }
    this.fetch();
  }

  ngOnDestroy(): void {
    this.apercuStore.clearAll();
  }

  protected onRetry(): void {
    this.fetch();
  }

  protected onRetourListe(): void {
    this.router.navigateByUrl('/');
  }

  protected onOuvrirImage(index: number): void {
    this.imageOuverteIndex.set(index);
  }

  protected onFermerViewer(): void {
    this.imageOuverteIndex.set(null);
  }

  private fetch(): void {
    this.loading.set(true);
    this.error.set(null);

    this.examenService.detail(this.examenId).subscribe({
      next: (response) => {
        this.examen.set(response);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(err.status === 404 ? 'not-found' : 'generic');
      },
    });
  }
}
