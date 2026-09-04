import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ExamenImage } from '../../models/examen.model';
import { ExamenService } from '../../services/examen.service';
import { ExamenImageApercu } from './examen-image-apercu';

const IMAGE_DISPONIBLE: ExamenImage = { imageId: 1, format: 'PNG', apercuDisponible: true, ordre: 0 };
const IMAGE_INDISPONIBLE: ExamenImage = { imageId: 2, format: 'DICOM', apercuDisponible: false, ordre: 1 };

describe('ExamenImageApercu', () => {
  let examenService: Partial<ExamenService>;
  let createObjectURLSpy: ReturnType<typeof vi.fn>;
  let revokeObjectURLSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    examenService = { apercu: vi.fn() };

    createObjectURLSpy = vi.fn().mockReturnValue('blob:fake-url');
    revokeObjectURLSpy = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL: createObjectURLSpy, revokeObjectURL: revokeObjectURLSpy });

    await TestBed.configureTestingModule({
      imports: [ExamenImageApercu],
      providers: [{ provide: ExamenService, useValue: examenService }],
    }).compileComponents();
  });

  afterEach(() => vi.unstubAllGlobals());

  function createComponent(image: ExamenImage) {
    const fixture = TestBed.createComponent(ExamenImageApercu);
    fixture.componentRef.setInput('examenId', 10);
    fixture.componentRef.setInput('image', image);
    fixture.detectChanges();
    return fixture;
  }

  it('charge un aperçu disponible et crée une URL objet', () => {
    (examenService.apercu as ReturnType<typeof vi.fn>).mockReturnValue(of(new Blob(['x'])));

    const fixture = createComponent(IMAGE_DISPONIBLE);

    expect(examenService.apercu).toHaveBeenCalledWith(10, 1);
    expect(fixture.componentInstance['objectUrl']()).toBe('blob:fake-url');
    expect(fixture.componentInstance['error']()).toBe(false);
  });

  it("n'appelle pas l'endpoint gardien quand apercuDisponible est false", () => {
    createComponent(IMAGE_INDISPONIBLE);

    expect(examenService.apercu).not.toHaveBeenCalled();
  });

  it("affiche une erreur en cas d'échec de l'endpoint gardien", () => {
    (examenService.apercu as ReturnType<typeof vi.fn>).mockReturnValue(throwError(() => new Error('boom')));

    const fixture = createComponent(IMAGE_DISPONIBLE);

    expect(fixture.componentInstance['error']()).toBe(true);
    expect(fixture.componentInstance['loading']()).toBe(false);
  });

  it("révoque l'URL objet à la destruction du composant", () => {
    (examenService.apercu as ReturnType<typeof vi.fn>).mockReturnValue(of(new Blob(['x'])));

    const fixture = createComponent(IMAGE_DISPONIBLE);
    fixture.destroy();

    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-url');
  });
});
