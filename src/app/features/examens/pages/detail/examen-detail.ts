import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';
import { AnalyseStatut, AnalyseStatutInfo, Detection } from '../../models/detection.model';
import { ExamenDetail as ExamenDetailModel } from '../../models/examen.model';
import { DetectionService } from '../../services/detection.service';
import { ExamenImageApercuStore } from '../../services/examen-image-apercu-store.service';
import { ExamenService } from '../../services/examen.service';
import { ExamenImageApercu } from './examen-image-apercu';
import { ExamenImageViewer } from './examen-image-viewer';

const INTERVALLE_POLLING_MS = 5000;
const INTERVALLE_DUREE_MS = 1000;

@Component({
  selector: 'app-examen-detail',
  imports: [DatePipe, ExamenImageApercu, ExamenImageViewer],
  templateUrl: './examen-detail.html',
})
export class ExamenDetail implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly examenService = inject(ExamenService);
  private readonly detectionService = inject(DetectionService);
  private readonly authService = inject(AuthService);
  private readonly apercuStore = inject(ExamenImageApercuStore);

  private readonly examenId: number;

  protected readonly examen = signal<ExamenDetailModel | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<'not-found' | 'generic' | null>(null);
  protected readonly imageOuverteIndex = signal<number | null>(null);

  protected readonly statutAnalyse = signal<AnalyseStatut | null>(null);
  protected readonly analyseMessage = signal<string | null>(null);
  protected readonly detections = signal<Detection[]>([]);
  protected readonly erreurAnalyse = signal<string | null>(null);
  protected readonly dureeEcoulee = signal(0);

  private pollingHandle: ReturnType<typeof setInterval> | null = null;
  private dureeHandle: ReturnType<typeof setInterval> | null = null;

  protected readonly peutAnalyser = computed(() => {
    const role = this.authService.currentUser()?.role;
    const roleOk = role === 'RADIOLOGUE' || role === 'TECHNICIEN';
    const statut = this.statutAnalyse();
    return roleOk && (statut === 'EN_ATTENTE' || statut === 'ECHOUEE');
  });

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
    this.arreterPolling();
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

  protected onAnalyser(): void {
    this.erreurAnalyse.set(null);
    this.detectionService.analyser(this.examenId).subscribe({
      next: () => {
        this.statutAnalyse.set('EN_COURS');
        this.demarrerPolling();
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409) {
          this.erreurAnalyse.set('Une analyse est déjà en cours pour cet examen.');
          this.statutAnalyse.set('EN_COURS');
          this.demarrerPolling();
        } else if (err.status === 422) {
          this.erreurAnalyse.set('Zone anatomique non reconnue, analyse impossible.');
        } else {
          this.erreurAnalyse.set("Impossible de lancer l'analyse, réessayez plus tard.");
        }
      },
    });
  }

  private fetch(): void {
    this.loading.set(true);
    this.error.set(null);

    this.examenService.detail(this.examenId).subscribe({
      next: (response) => {
        this.examen.set(response);
        this.loading.set(false);
        this.chargerStatutInitial();
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(err.status === 404 ? 'not-found' : 'generic');
      },
    });
  }

  private chargerStatutInitial(): void {
    this.detectionService.statut(this.examenId).subscribe({
      next: (info) => {
        this.statutAnalyse.set(info.statut);
        this.analyseMessage.set(info.message);
        if (info.statut === 'EN_COURS') {
          this.demarrerPolling();
        } else if (info.statut === 'TERMINEE') {
          this.chargerDetections();
        }
      },
      error: () => {
        // statutAnalyse reste null : le bloc "Analyser (IA)" reste masqué
        // plutôt que d'afficher une erreur bloquante sur la page examen.
      },
    });
  }

  private chargerDetections(): void {
    this.detectionService.lister(this.examenId).subscribe({
      next: (liste) => this.detections.set(liste),
      error: () => {
        // liste vide conservée, ne bloque pas l'affichage de la page.
      },
    });
  }

  private demarrerPolling(): void {
    this.arreterPolling();
    this.dureeEcoulee.set(0);
    this.dureeHandle = setInterval(() => this.dureeEcoulee.update((d) => d + 1), INTERVALLE_DUREE_MS);
    this.pollingHandle = setInterval(() => this.verifierStatut(), INTERVALLE_POLLING_MS);
  }

  private verifierStatut(): void {
    this.detectionService.statut(this.examenId).subscribe({
      next: (info: AnalyseStatutInfo) => {
        this.statutAnalyse.set(info.statut);
        this.analyseMessage.set(info.message);
        if (info.statut === 'TERMINEE') {
          this.arreterPolling();
          this.chargerDetections();
        } else if (info.statut === 'ECHOUEE') {
          this.arreterPolling();
        }
      },
      error: () => {
        // erreur transitoire (réseau/5xx) : ne stoppe pas le polling, retry au prochain tick.
      },
    });
  }

  private arreterPolling(): void {
    if (this.pollingHandle !== null) {
      clearInterval(this.pollingHandle);
      this.pollingHandle = null;
    }
    if (this.dureeHandle !== null) {
      clearInterval(this.dureeHandle);
      this.dureeHandle = null;
    }
  }
}
