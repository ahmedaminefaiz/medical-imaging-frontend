import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AuthService } from '../../../auth/services/auth.service';
import { Home } from './home';

describe('Home', () => {
  let authService: Partial<AuthService>;

  beforeEach(async () => {
    authService = {
      currentUser: signal({ email: 'radiologue@xeleronai.com', role: 'RADIOLOGUE', exp: 0 }) as AuthService['currentUser'],
      logout: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [provideRouter([]), { provide: AuthService, useValue: authService }],
    }).compileComponents();
  });

  it("affiche l'email de l'utilisateur courant", () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('radiologue@xeleronai.com');
  });

  it('appelle authService.logout() au clic sur Déconnexion', () => {
    const fixture = TestBed.createComponent(Home);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();

    expect(authService.logout).toHaveBeenCalled();
  });
});
