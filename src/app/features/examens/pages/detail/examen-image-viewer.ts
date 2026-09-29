import { DecimalPipe } from '@angular/common';
import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Detection, DetectionStatut } from '../../models/detection.model';
import { ExamenImage } from '../../models/examen.model';
import { ExamenImageApercuStore } from '../../services/examen-image-apercu-store.service';

const ZOOM_MIN = 1;
const ZOOM_MAX = 5;
const ZOOM_STEP_BOUTON = 0.25;
const CLASSE_PAR_STATUT: Record<DetectionStatut, string> = {
  EN_ATTENTE: 'border-amber-400 bg-amber-400/10',
  ACCEPTEE: 'border-green-500 bg-green-500/10',
  REJETEE: 'border-red-500 bg-red-500/10 opacity-50',
};
const ZOOM_STEP_MOLETTE = 0.1;

function clamp(valeur: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valeur));
}

@Component({
  selector: 'app-examen-image-viewer',
  imports: [DecimalPipe],
  templateUrl: './examen-image-viewer.html',
})
export class ExamenImageViewer implements OnInit, OnDestroy {
  private readonly store = inject(ExamenImageApercuStore);

  readonly examenId = input.required<number>();
  readonly images = input.required<ExamenImage[]>();
  readonly detections = input.required<Detection[]>();
  readonly indexInitial = input.required<number>();
  readonly fermer = output<void>();

  private readonly conteneurImage = viewChild<ElementRef<HTMLElement>>('conteneurImage');

  protected readonly indexCourant = signal(0);
  protected readonly niveauZoom = signal(ZOOM_MIN);
  protected readonly pan = signal({ x: 0, y: 0 });
  protected readonly dimensionsImage = signal<{ largeur: number; hauteur: number } | null>(null);

  private enTrainDeDeplacer = false;
  private dernierPointeur = { x: 0, y: 0 };

  private readonly onKeydown = (event: KeyboardEvent): void => this.gererClavier(event);
  private readonly onMouseMove = (event: MouseEvent): void => this.gererDeplacement(event);
  private readonly onMouseUp = (): void => this.arreterDeplacement();

  protected readonly imageCourante = computed<ExamenImage>(() => this.images()[this.indexCourant()]);

  protected readonly entreeCourante = computed(() => this.store.entree(this.imageCourante().imageId)());

  protected readonly transformStyle = computed(
    () => `scale(${this.niveauZoom()}) translate(${this.pan().x}px, ${this.pan().y}px)`
  );

  protected readonly zoomPourcentage = computed(() => Math.round(this.niveauZoom() * 100));

  protected readonly indexPrecedentOuvrable = computed(() => this.chercherIndexOuvrable(-1));
  protected readonly indexSuivantOuvrable = computed(() => this.chercherIndexOuvrable(1));

  protected readonly position = computed(
    () => `Image ${this.imageCourante().ordre} — ${this.indexCourant() + 1} / ${this.images().length}`
  );

  protected readonly detectionsCoupeCourante = computed(() =>
    this.detections().filter((d) => d.coupe === this.imageCourante().ordre)
  );

  protected readonly coupesAvecDetection = computed(() =>
    [...new Set(this.detections().map((d) => d.coupe))].sort((a, b) => a - b)
  );

  protected readonly coupesAvecDetectionAffichage = computed(() => this.coupesAvecDetection().join(', '));

  ngOnInit(): void {
    this.indexCourant.set(this.indexInitial());
    this.store.charger(this.examenId(), this.imageCourante());

    window.addEventListener('keydown', this.onKeydown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('mouseleave', this.onMouseUp);
  }

  ngOnDestroy(): void {
    window.removeEventListener('keydown', this.onKeydown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('mouseleave', this.onMouseUp);
  }

  protected onFermer(): void {
    this.fermer.emit();
  }

  protected onArretPropagation(event: MouseEvent): void {
    event.stopPropagation();
  }

  protected onImageChargee(img: HTMLImageElement): void {
    this.dimensionsImage.set({ largeur: img.naturalWidth, hauteur: img.naturalHeight });
  }

  protected classeStatut(statut: DetectionStatut): string {
    return CLASSE_PAR_STATUT[statut];
  }

  protected onZoomIn(): void {
    this.niveauZoom.update((z) => clamp(z + ZOOM_STEP_BOUTON, ZOOM_MIN, ZOOM_MAX));
  }

  protected onZoomOut(): void {
    this.niveauZoom.update((z) => clamp(z - ZOOM_STEP_BOUTON, ZOOM_MIN, ZOOM_MAX));
  }

  protected onReset(): void {
    this.niveauZoom.set(ZOOM_MIN);
    this.pan.set({ x: 0, y: 0 });
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY < 0 ? ZOOM_STEP_MOLETTE : -ZOOM_STEP_MOLETTE;
    this.niveauZoom.update((z) => clamp(z + delta, ZOOM_MIN, ZOOM_MAX));
  }

  protected onPointerDown(event: MouseEvent): void {
    if (this.niveauZoom() <= ZOOM_MIN) {
      return;
    }
    this.enTrainDeDeplacer = true;
    this.dernierPointeur = { x: event.clientX, y: event.clientY };
  }

  protected onPrecedent(): void {
    this.allerA(this.indexPrecedentOuvrable());
  }

  protected onSuivant(): void {
    this.allerA(this.indexSuivantOuvrable());
  }

  private allerA(index: number | null): void {
    if (index === null) {
      return;
    }
    this.indexCourant.set(index);
    this.dimensionsImage.set(null);
    this.store.charger(this.examenId(), this.imageCourante());
    this.niveauZoom.set(ZOOM_MIN);
    this.pan.set({ x: 0, y: 0 });
  }

  private gererDeplacement(event: MouseEvent): void {
    if (!this.enTrainDeDeplacer) {
      return;
    }
    const deltaX = event.clientX - this.dernierPointeur.x;
    const deltaY = event.clientY - this.dernierPointeur.y;
    this.dernierPointeur = { x: event.clientX, y: event.clientY };

    const conteneur = this.conteneurImage()?.nativeElement;
    const maxOffsetX = conteneur ? ((this.niveauZoom() - 1) * conteneur.clientWidth) / 2 : Infinity;
    const maxOffsetY = conteneur ? ((this.niveauZoom() - 1) * conteneur.clientHeight) / 2 : Infinity;

    this.pan.update((p) => ({
      x: clamp(p.x + deltaX, -maxOffsetX, maxOffsetX),
      y: clamp(p.y + deltaY, -maxOffsetY, maxOffsetY),
    }));
  }

  private arreterDeplacement(): void {
    this.enTrainDeDeplacer = false;
  }

  private gererClavier(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.fermer.emit();
    } else if (event.key === 'ArrowLeft') {
      this.onPrecedent();
    } else if (event.key === 'ArrowRight') {
      this.onSuivant();
    }
  }

  private estOuvrable(image: ExamenImage): boolean {
    if (!image.apercuDisponible) {
      return false;
    }
    const entree = this.store.entree(image.imageId)();
    return entree !== undefined && !entree.loading && !entree.error;
  }

  private chercherIndexOuvrable(direction: 1 | -1): number | null {
    const liste = this.images();
    for (let i = this.indexCourant() + direction; i >= 0 && i < liste.length; i += direction) {
      if (this.estOuvrable(liste[i])) {
        return i;
      }
    }
    return null;
  }
}
