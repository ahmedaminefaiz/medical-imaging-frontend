import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { DetectionService } from './detection.service';

describe('DetectionService', () => {
  let service: DetectionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DetectionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('analyser() appelle POST .../detections/analyser avec un corps vide', () => {
    service.analyser(42).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/v1/examens/42/detections/analyser`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush({ examenId: 42, statut: 'EN_COURS' });
  });

  it('statut() appelle GET .../detections/statut', () => {
    service.statut(42).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/v1/examens/42/detections/statut`);
    expect(req.request.method).toBe('GET');
    req.flush({ examenId: 42, statut: 'EN_ATTENTE', message: null, finieLe: null });
  });

  it('lister() appelle GET .../detections', () => {
    service.lister(42).subscribe();

    const req = httpMock.expectOne(`${environment.apiUrl}/v1/examens/42/detections`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
});
