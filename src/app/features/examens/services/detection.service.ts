import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AnalyseLancee, AnalyseStatutInfo, Detection } from '../models/detection.model';

@Injectable({ providedIn: 'root' })
export class DetectionService {
  private readonly http = inject(HttpClient);

  analyser(examenId: number): Observable<AnalyseLancee> {
    return this.http.post<AnalyseLancee>(
      `${environment.apiUrl}/v1/examens/${examenId}/detections/analyser`,
      {}
    );
  }

  statut(examenId: number): Observable<AnalyseStatutInfo> {
    return this.http.get<AnalyseStatutInfo>(
      `${environment.apiUrl}/v1/examens/${examenId}/detections/statut`
    );
  }

  lister(examenId: number): Observable<Detection[]> {
    return this.http.get<Detection[]>(`${environment.apiUrl}/v1/examens/${examenId}/detections`);
  }
}
