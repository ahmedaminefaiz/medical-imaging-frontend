import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PageResponse } from '../../../shared/models/page-response.model';
import { ExamenSummary } from '../models/examen.model';

@Injectable({ providedIn: 'root' })
export class ExamenService {
  private readonly http = inject(HttpClient);

  lister(mrn: string | null, page: number, size: number): Observable<PageResponse<ExamenSummary>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (mrn) {
      params = params.set('mrn', mrn);
    }
    return this.http.get<PageResponse<ExamenSummary>>(`${environment.apiUrl}/v1/examens`, { params });
  }
}
