import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ExamenDetail as ExamenDetailModel } from '../../models/examen.model';
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

function configure(
  id: string,
  examenService: Partial<ExamenService>,
  apercuStore: Partial<ExamenImageApercuStore>
) {
  return TestBed.configureTestingModule({
    imports: [ExamenDetail],
    providers: [
      provideRouter([]),
      { provide: ExamenService, useValue: examenService },
      { provide: ExamenImageApercuStore, useValue: apercuStore },
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id }) } } },
    ],
  }).compileComponents();
}

describe('ExamenDetail', () => {
  let examenService: Partial<ExamenService>;
  let apercuStore: Partial<ExamenImageApercuStore>;

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
  });

  it('charge le détail avec l\'id numérique lu depuis la route', async () => {
    await configure('1', examenService, apercuStore);
    TestBed.createComponent(ExamenDetail).detectChanges();

    expect(examenService.detail).toHaveBeenCalledWith(1);
  });

  it('affiche les infos patient/examen et une tuile par image', async () => {
    await configure('1', examenService, apercuStore);
    const fixture = TestBed.createComponent(ExamenDetail);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('MRN-001');
    expect(text).toContain('Radio thorax');
    expect(fixture.nativeElement.querySelectorAll('app-examen-image-apercu').length).toBe(1);
  });

  it('affiche un message quand l\'examen n\'a aucune image', async () => {
    (examenService.detail as ReturnType<typeof vi.fn>).mockReturnValue(of({ ...EXAMEN, images: [] }));
    await configure('1', examenService, apercuStore);
    const fixture = TestBed.createComponent(ExamenDetail);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Aucune image pour cet examen.');
  });

  it('affiche "Examen introuvable" sans bouton Réessayer sur un 404', async () => {
    (examenService.detail as ReturnType<typeof vi.fn>).mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 }))
    );
    await configure('1', examenService, apercuStore);
    const fixture = TestBed.createComponent(ExamenDetail);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Examen introuvable');
    expect(text).not.toContain('Réessayer');
  });

  it('affiche une erreur générique avec bouton Réessayer sur un 500', async () => {
    (examenService.detail as ReturnType<typeof vi.fn>).mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 500 }))
    );
    await configure('1', examenService, apercuStore);
    const fixture = TestBed.createComponent(ExamenDetail);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain("Impossible de charger l'examen");

    (examenService.detail as ReturnType<typeof vi.fn>).mockReturnValue(of(EXAMEN));
    fixture.componentInstance['onRetry']();

    expect(examenService.detail).toHaveBeenCalledTimes(2);
  });

  it("traite un id non numérique comme 'not-found' sans appel réseau", async () => {
    await configure('abc', examenService, apercuStore);
    const fixture = TestBed.createComponent(ExamenDetail);
    fixture.detectChanges();

    expect(examenService.detail).not.toHaveBeenCalled();
    expect(fixture.componentInstance['error']()).toBe('not-found');
  });

  it('le bouton Retour à la liste navigue vers /', async () => {
    await configure('1', examenService, apercuStore);
    const fixture = TestBed.createComponent(ExamenDetail);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    fixture.detectChanges();

    fixture.componentInstance['onRetourListe']();

    expect(navigateSpy).toHaveBeenCalledWith('/');
  });

  it('le clic sur une tuile ouvre le viewer plein écran', async () => {
    await configure('1', examenService, apercuStore);
    const fixture = TestBed.createComponent(ExamenDetail);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-examen-image-viewer')).toBeNull();

    fixture.nativeElement.querySelector('app-examen-image-apercu button').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-examen-image-viewer')).not.toBeNull();
  });

  it('(fermer) émis par le viewer masque le viewer', async () => {
    await configure('1', examenService, apercuStore);
    const fixture = TestBed.createComponent(ExamenDetail);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('app-examen-image-apercu button').click();
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[aria-label="Fermer"]').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-examen-image-viewer')).toBeNull();
  });

  it('la destruction du composant appelle ExamenImageApercuStore.clearAll()', async () => {
    await configure('1', examenService, apercuStore);
    const fixture = TestBed.createComponent(ExamenDetail);
    fixture.detectChanges();

    fixture.destroy();

    expect(apercuStore.clearAll).toHaveBeenCalled();
  });
});
