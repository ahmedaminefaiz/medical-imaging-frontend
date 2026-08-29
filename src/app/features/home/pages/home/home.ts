import { Component, inject } from '@angular/core';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-home',
  imports: [],
  templateUrl: './home.html',
})
export class Home {
  protected readonly authService = inject(AuthService);

  protected onLogout(): void {
    this.authService.logout();
  }
}
