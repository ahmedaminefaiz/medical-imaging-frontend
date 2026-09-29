import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CurrentUser } from '../../../auth/models/auth.model';
import { AuthService } from '../../../auth/services/auth.service';
import { AnalyseStatutInfo, Detection } from '../../models/detection.model';
import { ExamenDetail as ExamenDetailModel } from '../../models/examen.model';
import { DetectionService } from '../../services/detection.service';
import { ExamenImageApercuStore } from '../../services/examen-image-apercu-store.service';
import { ExamenService } from '../../services/examen.service';
import { ExamenDetail } from './examen-detail';

const EXAMEN: ExamenDetailModel = {
  examenId: 1,
  patient: { patientId: 1, mrn: 'MRN-001', nom: 'Dupont', dateNaissance: '1980-01-01', sexe: 'M' },
  type: 'Radio thorax',
  dateExamen: '2026-08-20',
  modalite: 'CR',
  zone: 'THORAX',
  creePar: 'radiologue@xeleronai.com',
  images: [{ imageId: 1, format: 'PNG', apercuDisponible: true, ordre: 0 }],
};

const STATUT_EN_ATTENTE: AnalyseStatutInfo = {
  examenId: 1,
  statut: 'EN_ATTENTE',
  message: null,
  finieLe: null,
};

const RADIOLOGUE: CurrentUser = { email: 'radio@test.com', role: 'RADIOLOGUE', exp: 9999999999 };
const ADMIN: CurrentUser = { email: 'admin@test.com', role: 'ADMIN', exp: 9999999999 };

const DETECTIONS: Detection[] = [
  {
    id: 1,
    imageId: 1,
    type: 'BOX',
    anomalie: 'nodule',
    confiance: 0.87,
    statut: 'EN_ATTENTE',
    coupe: 0,
    bbox: { x: 10, y: 10, largeur: 20, hauteur: 20 },
    cheminMasque: null,
  },
];

function configure(
  id: string,
  examenService: Partial<ExamenService>,
  apercuStore: Partial<ExamenImageApercuStore>,
  detectionService: Partial<DetectionService>,
  authService: Partial<AuthService>
) {
  return TestBed.configureTestingModule({
    imports: [ExamenDetail],
    providers: [
      provideRouter([]),
      { provide: ExamenService, useValue: examenService },
      { provide: ExamenImageApercuStore, useValue: apercuStore },
      { provide: DetectionService, useValue: detectionService },
      { provide: AuthService, useValue: authService },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
    ],
  }).compileComponents();
}

describe('ExamenDetail', () => {
  let examenService: Partial<ExamenService>;
  let apercuStore: Partial<ExamenImageApercuStore>;
  let detectionService: Partial<DetectionService>;
  let authService: Partial<AuthService>;

  beforeEach(() => {
    examenService = {
      detail: vi.fn().mockReturnValue(of(EXAMEN)),
      apercu: vi.fn().mockReturnValue(of(new Blob(['x']))),
    };
    apercuStore = {
      charger: vi.fn(),
      entree: vi.fn().mockReturnValue(signal({ objectUrl: 'blob:fake-url', loading: false, error: false })),
      clearAll: vi.fn(),
    };
    detectionService = {
      statut: vi.fn().mockReturnValue(of(STATUT_EN_ATTENTE)),
      analyser: vi.fn(),
      lister: vi.fn().mockReturnValue(of([])),
    };
    authService = { currentUser: signal<CurrentUser | null>(RADIOLOGUE) };
  });

  function creerFixture(id = '1') {
    return configure(id, examenService, apercuStore, detectionService, authService).then(() => {
      const fixture = TestBed.createComponent(ExamenDetail);
      fixture.detectChanges();
      return fixture;
    });
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('charge le détail avec l\'id numérique lu depuis la route', async () => {
    await creerFixture();

    expect(examenService.detail).toHaveBeenCalledWith(1);
  });

  it('affiche les infos patient/examen et une tuile par image', async () => {
    const fixture = await creerFixture();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('MRN-001');
    expect(text).toContain('Radio thorax');
    expect(fixture.nativeElement.querySelectorAll('app-examen-image-apercu').length).toBe(1);
  });

  it('affiche un message quand l\'examen n\'a aucune image', async () => {
    (examenService.detail as ReturnType<typeof vi.fn>).mockReturnValue(of({ ...EXAMEN, images: [] }));
    const fixture = await creerFixture();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Aucune image pour cet examen.');
  });

  it('affiche "Examen introuvable" sans bouton Réessayer sur un 404', async () => {
    (examenService.detail as ReturnType<typeof vi.fn>).mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 }))
    );
    const fixture = await creerFixture();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Examen introuvable');
    expect(text).not.toContain('Réessayer');
  });

  it('affiche une erreur générique avec bouton Réessayer sur un 500', async () => {
    (examenService.detail as ReturnType<typeof vi.fn>).mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 }))
    );
    const fixture = await creerFixture();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Impossible de charger l'examen");

    (examenService.detail as ReturnType<typeof vi.fn>).mockReturnValue(of(EXAMEN));
    fixture.componentInstance['onRetry']();

    expect(examenService.detail).toHaveBeenCalledTimes(2);
  });

  it("traite un id non numérique comme 'not-found' sans appel réseau", async () => {
    const fixture = await creerFixture('abc');

    expect(examenService.detail).not.toHaveBeenCalled();
    expect(fixture.componentInstance['error']()).toBe('not-found');
  });

  it('le bouton Retour à la liste navigue vers /', async () => {
    const fixture = await creerFixture();
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    fixture.componentInstance['onRetourListe']();

    expect(navigateSpy).toHaveBeenCalledWith('/');
  });

  it('le clic sur une tuile ouvre le viewer plein écran', async () => {
    const fixture = await creerFixture();

    expect(fixture.nativeElement.querySelector('app-examen-image-viewer')).toBeNull();

    fixture.nativeElement.querySelector('app-examen-image-apercu button').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-examen-image-viewer')).not.toBeNull();
  });

  it('(fermer) émis par le viewer masque le viewer', async () => {
    const fixture = await creerFixture();

    fixture.nativeElement.querySelector('app-examen-image-apercu button').click();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[aria-label="Fermer"]').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-examen-image-viewer')).toBeNull();
  });

  it('la destruction du composant appelle ExamenImageApercuStore.clearAll()', async () => {
    const fixture = await creerFixture();

    fixture.destroy();

    expect(apercuStore.clearAll).toHaveBeenCalled();
  });

  describe('Analyse IA', () => {
    it('affiche le bouton "Analyser (IA)" pour un RADIOLOGUE quand le statut est EN_ATTENTE', async () => {
      const fixture = await creerFixture();

      const bouton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b) => (b as HTMLButtonElement).textContent?.includes('Analyser (IA)')
      );
      expect(bouton).toBeDefined();
    });

    it('masque le bouton pour un ADMIN', async () => {
      authService = { currentUser: signal<CurrentUser | null>(ADMIN) };
      const fixture = await creerFixture();

      const bouton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b) => (b as HTMLButtonElement).textContent?.includes('Analyser (IA)')
      );
      expect(bouton).toBeUndefined();
    });

    it('masque le bouton quand le statut est TERMINEE', async () => {
      (detectionService.statut as ReturnType<typeof vi.fn>).mockReturnValue(
        of({ examenId: 1, statut: 'TERMINEE', message: null, finieLe: '2026-09-28T14:00:00' })
      );
      const fixture = await creerFixture();

      const bouton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b) => (b as HTMLButtonElement).textContent?.includes('Analyser (IA)')
      );
      expect(bouton).toBeUndefined();
      expect(detectionService.lister).toHaveBeenCalledWith(1);
    });

    it('masque le bouton quand le statut est EN_COURS et démarre le polling', async () => {
      vi.useFakeTimers();
      (detectionService.statut as ReturnType<typeof vi.fn>).mockReturnValue(
        of({ examenId: 1, statut: 'EN_COURS', message: null, finieLe: null })
      );
      const fixture = await creerFixture();

      const bouton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
        (b) => (b as HTMLButtonElement).textContent?.includes('Analyser (IA)')
      );
      expect(bouton).toBeUndefined();

      (detectionService.statut as ReturnType<typeof vi.fn>).mockClear();
      vi.advanceTimersByTime(5000);

      expect(detectionService.statut).toHaveBeenCalledWith(1);
      fixture.destroy();
    });

    it('clic sur Analyser (202) passe en EN_COURS et démarre le polling', async () => {
      vi.useFakeTimers();
      (detectionService.analyser as ReturnType<typeof vi.fn>).mockReturnValue(
        of({ examenId: 1, statut: 'EN_COURS' })
      );
      const fixture = await creerFixture();

      fixture.componentInstance['onAnalyser']();
      fixture.detectChanges();

      expect(fixture.componentInstance['statutAnalyse']()).toBe('EN_COURS');

      (detectionService.statut as ReturnType<typeof vi.fn>).mockClear();
      vi.advanceTimersByTime(5000);

      expect(detectionService.statut).toHaveBeenCalledWith(1);
      fixture.destroy();
    });

    it('409 affiche le message dédié et resynchronise sur EN_COURS', async () => {
      (detectionService.analyser as ReturnType<typeof vi.fn>).mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 409 }))
      );
      const fixture = await creerFixture();

      fixture.componentInstance['onAnalyser']();
      fixture.detectChanges();

      expect(fixture.componentInstance['erreurAnalyse']()).toBe(
        'Une analyse est déjà en cours pour cet examen.'
      );
      expect(fixture.componentInstance['statutAnalyse']()).toBe('EN_COURS');
      fixture.destroy();
    });

    it('422 affiche le message "Zone anatomique non reconnue, analyse impossible."', async () => {
      (detectionService.analyser as ReturnType<typeof vi.fn>).mockReturnValue(
        throwError(() => new HttpErrorResponse({ status: 422 }))
      );
      const fixture = await creerFixture();

      fixture.componentInstance['onAnalyser']();
      fixture.detectChanges();

      expect(fixture.componentInstance['erreurAnalyse']()).toBe(
        'Zone anatomique non reconnue, analyse impossible.'
      );
    });

    it('le polling s\'arrête et charge les détections quand le statut passe à TERMINEE', async () => {
      vi.useFakeTimers();
      (detectionService.analyser as ReturnType<typeof vi.fn>).mockReturnValue(
        of({ examenId: 1, statut: 'EN_COURS' })
      );
      (detectionService.lister as ReturnType<typeof vi.fn>).mockReturnValue(of(DETECTIONS));
      const fixture = await creerFixture();

      fixture.componentInstance['onAnalyser']();

      (detectionService.statut as ReturnType<typeof vi.fn>).mockReturnValue(
        of({ examenId: 1, statut: 'TERMINEE', message: null, finieLe: '2026-09-28T14:00:00' })
      );
      vi.advanceTimersByTime(5000);

      expect(fixture.componentInstance['statutAnalyse']()).toBe('TERMINEE');
      expect(fixture.componentInstance['detections']()).toEqual(DETECTIONS);

      (detectionService.statut as ReturnType<typeof vi.fn>).mockClear();
      vi.advanceTimersByTime(5000);
      expect(detectionService.statut).not.toHaveBeenCalled();
    });

    it('la destruction du composant arrête le polling (plus aucun appel statut() après)', async () => {
      vi.useFakeTimers();
      (detectionService.analyser as ReturnType<typeof vi.fn>).mockReturnValue(
        of({ examenId: 1, statut: 'EN_COURS' })
      );
      const fixture = await creerFixture();

      fixture.componentInstance['onAnalyser']();
      fixture.destroy();

      (detectionService.statut as ReturnType<typeof vi.fn>).mockClear();
      vi.advanceTimersByTime(10000);

      expect(detectionService.statut).not.toHaveBeenCalled();
    });
  });
});
