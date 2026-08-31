import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { ExamenService } from './examen.service';

describe('ExamenService', () => {
  let service: ExamenService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ExamenService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('envoie page et size en query params', () => {
    service.lister(null, 2, 20).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/v1/examens`
    );
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.has('mrn')).toBe(false);
    req.flush({ content: [], page: 2, size: 20, totalElements: 0, totalPages: 0 });
  });

  it('ajoute mrn uniquement quand il est fourni', () => {
    service.lister('MRN-001', 0, 20).subscribe();

    const req = httpMock.expectOne(
      (r) => r.url === `${environment.apiUrl}/v1/examens`
    );
    expect(req.request.params.get('mrn')).toBe('MRN-001');
    req.flush({ content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
  });
});
