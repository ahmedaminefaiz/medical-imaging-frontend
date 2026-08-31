import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-examen-detail',
  imports: [],
  templateUrl: './examen-detail.html',
})
export class ExamenDetail {
  private readonly route = inject(ActivatedRoute);

  protected readonly id = this.route.snapshot.paramMap.get('id');
}
