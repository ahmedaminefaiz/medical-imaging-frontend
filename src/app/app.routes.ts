import { Routes } from '@angular/router';
import { authGuard } from './features/auth/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/pages/login/login').then((m) => m.Login),
  },
  {
    path: '',
    loadComponent: () => import('./features/home/pages/home/home').then((m) => m.Home),
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: 'login' },
];
