import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const adminGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isLogged = authService.isLoggedIn();
  const isAdmin = authService.isAdmin();

  if (isLogged && isAdmin) {
    return true;
  }

  const target = isLogged ? ['/home'] : ['/login'];
  const extras = isLogged ? {} : { queryParams: { returnUrl: state.url } };
  router.navigate(target, extras);

  return false;
};

