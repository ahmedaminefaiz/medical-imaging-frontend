import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Detection } from '../../models/detection.model';
import { ExamenImage } from '../../models/examen.model';
import { ApercuEntree, ExamenImageApercuStore } from '../../services/examen-image-apercu-store.service';
import { ExamenImageViewer } from './examen-image-viewer';

const IMAGES: ExamenImage[] = [
  { imageId: 1, format: 'PNG', apercuDisponible: true, ordre: 0 },
  { imageId: 2, format: 'PNG', apercuDisponible: false, ordre: 1 },
  { imageId: 3, format: 'PNG', apercuDisponible: true, ordre: 2 },
  { imageId: 4, format: 'PNG', apercuDisponible: true, ordre: 3 },
];

const DETECTIONS: Detection[] = [
  {
    id: 1,
    imageId: 1,
    type: 'BOX',
    anomalie: 'nodule',
    confiance: 0.87,
    statut: 'EN_ATTENTE',
    coupe: 0,
    bbox: { x: 128, y: 64, largeur: 32, hauteur: 32 },
    cheminMasque: null,
  },
  {
    id: 2,
    imageId: 3,
    type: 'BOX',
    anomalie: 'opacite',
    confiance: 0.6,
    statut: 'EN_ATTENTE',
    coupe: 2,
    bbox: { x: 0, y: 0, largeur: 512, hauteur: 512 },
    cheminMasque: null,
  },
];

const ENTREES: Record<number, ApercuEntree | undefined> = {
  1: { objectUrl: 'blob:1', loading: false, error: false },
  3: { objectUrl: 'blob:3', loading: false, error: false },
  4: { objectUrl: null, loading: false, error: true },
};

describe('ExamenImageViewer', () => {
  let store: Partial<ExamenImageApercuStore>;

  beforeEach(() => {
    store = {
      charger: vi.fn(),
      entree: vi.fn((imageId: number) => signal(ENTREES[imageId])),
    };
  });

  async function createComponent(indexInitial: number, detections: Detection[] = DETECTIONS) {
    await TestBed.configureTestingModule({
      imports: [ExamenImageViewer],
      providers: [{ provide: ExamenImageApercuStore, useValue: store }],
    }).compileComponents();

    const fixture = TestBed.createComponent(ExamenImageViewer);
    fixture.componentRef.setInput('examenId', 10);
    fixture.componentRef.setInput('images', IMAGES);
    fixture.componentRef.setInput('detections', detections);
    fixture.componentRef.setInput('indexInitial', indexInitial);
    fixture.detectChanges();
    return fixture;
  }

  it("s'ouvre sur l'image d'index initial", async () => {
    const fixture = await createComponent(0);

    expect(fixture.componentInstance['imageCourante']().imageId).toBe(1);
  });

  it('le zoom (boutons) reste borné entre 1 et 5', async () => {
    const fixture = await createComponent(0);
    const instance = fixture.componentInstance;

    for (let i = 0; i < 30; i++) {
      instance['onZoomIn']();
    }
    expect(instance['niveauZoom']()).toBe(5);

    for (let i = 0; i < 30; i++) {
      instance['onZoomOut']();
    }
    expect(instance['niveauZoom']()).toBe(1);
  });

  it('le zoom (molette) reste borné entre 1 et 5', async () => {
    const fixture = await createComponent(0);
    const instance = fixture.componentInstance;

    for (let i = 0; i < 60; i++) {
      instance['onWheel']({ deltaY: -1, preventDefault: () => {} } as WheelEvent);
    }
    expect(instance['niveauZoom']()).toBe(5);
  });

  it('le pan reste inactif tant que le zoom est à 1', async () => {
    const fixture = await createComponent(0);
    const instance = fixture.componentInstance;

    instance['onPointerDown'](new MouseEvent('mousedown', { clientX: 0, clientY: 0 }));
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 50, clientY: 50 }));

    expect(instance['pan']()).toEqual({ x: 0, y: 0 });
  });

  it('réinitialise le zoom et le pan via onReset', async () => {
    const fixture = await createComponent(0);
    const instance = fixture.componentInstance;

    instance['onZoomIn']();
    instance['pan'].set({ x: 10, y: 10 });

    instance['onReset']();

    expect(instance['niveauZoom']()).toBe(1);
    expect(instance['pan']()).toEqual({ x: 0, y: 0 });
  });

  it('onSuivant saute automatiquement les images non ouvrables', async () => {
    const fixture = await createComponent(0);
    const instance = fixture.componentInstance;

    instance['onSuivant'](); // image 2 non ouvrable (apercuDisponible: false) -> saute vers image 3

    expect(instance['imageCourante']().imageId).toBe(3);
  });

  it('onSuivant ne change rien quand aucune image ouvrable ne suit', async () => {
    const fixture = await createComponent(2); // image 3 (index 2)
    const instance = fixture.componentInstance;

    instance['onSuivant'](); // image 4 est en erreur -> aucune image ouvrable après

    expect(instance['imageCourante']().imageId).toBe(3);
  });

  it("onPrecedent ne change rien en butée sur la première image", async () => {
    const fixture = await createComponent(0);
    const instance = fixture.componentInstance;

    instance['onPrecedent']();

    expect(instance['imageCourante']().imageId).toBe(1);
  });

  it("les boutons précédent/suivant sont désactivés en butée", async () => {
    const fixture = await createComponent(2); // image 3 : rien avant sauf via saut, rien d'ouvrable après

    const boutons = fixture.nativeElement.querySelectorAll('button[aria-label="Image précédente"], button[aria-label="Image suivante"]');
    const [precedent, suivant] = Array.from(boutons) as HTMLButtonElement[];

    expect(precedent.disabled).toBe(false); // l'image 1 est ouvrable en remontant
    expect(suivant.disabled).toBe(true); // image 4 en erreur, rien après
  });

  it("changer d'image réinitialise systématiquement le zoom et le pan", async () => {
    const fixture = await createComponent(0);
    const instance = fixture.componentInstance;

    instance['onZoomIn']();
    instance['pan'].set({ x: 20, y: 20 });

    instance['onSuivant']();

    expect(instance['niveauZoom']()).toBe(1);
    expect(instance['pan']()).toEqual({ x: 0, y: 0 });
  });

  it('émet fermer au clic sur le bouton ✕', async () => {
    const fixture = await createComponent(0);
    const emitSpy = vi.fn();
    fixture.componentInstance.fermer.subscribe(emitSpy);

    fixture.nativeElement.querySelector('[aria-label="Fermer"]').click();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('émet fermer au clic sur le fond', async () => {
    const fixture = await createComponent(0);
    const emitSpy = vi.fn();
    fixture.componentInstance.fermer.subscribe(emitSpy);

    fixture.nativeElement.querySelector('[role="dialog"]').click();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('émet fermer sur la touche Échap', async () => {
    const fixture = await createComponent(0);
    const emitSpy = vi.fn();
    fixture.componentInstance.fermer.subscribe(emitSpy);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(emitSpy).toHaveBeenCalled();
  });

  it("n'émet pas fermer au clic sur l'image", async () => {
    const fixture = await createComponent(0);
    const emitSpy = vi.fn();
    fixture.componentInstance.fermer.subscribe(emitSpy);

    fixture.nativeElement.querySelector('img').click();

    expect(emitSpy).not.toHaveBeenCalled();
  });

  it("n'émet plus fermer sur Échap après la destruction du composant", async () => {
    const fixture = await createComponent(0);
    const emitSpy = vi.fn();
    fixture.componentInstance.fermer.subscribe(emitSpy);

    fixture.destroy();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(emitSpy).not.toHaveBeenCalled();
  });

  describe('overlay des détections', () => {
    it('ne filtre que les détections de la coupe affichée (coupe === ordre)', async () => {
      const fixture = await createComponent(0); // image d'ordre 0 -> détection id 1 uniquement

      expect(fixture.componentInstance['detectionsCoupeCourante']()).toEqual([DETECTIONS[0]]);
    });

    it('met à jour les détections affichées après un changement de coupe', async () => {
      const fixture = await createComponent(0);
      const instance = fixture.componentInstance;

      instance['onSuivant'](); // saute vers l'image d'ordre 2 (détection id 2)

      expect(instance['detectionsCoupeCourante']()).toEqual([DETECTIONS[1]]);
    });

    it("n'affiche aucune box tant que les dimensions naturelles de l'image ne sont pas connues", async () => {
      const fixture = await createComponent(0);

      expect(fixture.nativeElement.querySelectorAll('.pointer-events-none').length).toBe(0);
    });

    it('positionne la box en pourcentage selon les dimensions naturelles réelles de l\'image', async () => {
      const fixture = await createComponent(0);
      const instance = fixture.componentInstance;

      instance['onImageChargee']({ naturalWidth: 512, naturalHeight: 512 } as HTMLImageElement);
      fixture.detectChanges();

      const box = fixture.nativeElement.querySelector('.pointer-events-none') as HTMLElement;
      expect(box).not.toBeNull();
      expect(box.style.left).toBe('25%'); // 128 / 512 * 100
      expect(box.style.top).toBe('12.5%'); // 64 / 512 * 100
      expect(box.style.width).toBe('6.25%'); // 32 / 512 * 100
      expect(box.style.height).toBe('6.25%'); // 32 / 512 * 100
    });

    it('changer de coupe réinitialise les dimensions connues (pas de box avec les anciennes dimensions)', async () => {
      const fixture = await createComponent(0);
      const instance = fixture.componentInstance;

      instance['onImageChargee']({ naturalWidth: 512, naturalHeight: 512 } as HTMLImageElement);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('.pointer-events-none').length).toBe(1);

      instance['onSuivant']();
      fixture.detectChanges();

      expect(instance['dimensionsImage']()).toBeNull();
      expect(fixture.nativeElement.querySelectorAll('.pointer-events-none').length).toBe(0);
    });

    it("calcule la liste triée et dédupliquée des coupes qui portent des détections", async () => {
      const fixture = await createComponent(0);

      expect(fixture.componentInstance['coupesAvecDetection']()).toEqual([0, 2]);
    });
  });
});
