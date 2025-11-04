import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

function isApiPath(url: string): boolean {
  try {
    // Convierte relativas a absolutas contra el origen actual
    const u = new URL(url, window.location.origin);
    return u.pathname.startsWith('/api/');
  } catch {
    return url.startsWith('/api/');
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // si no es /api o ya trae Authorization, sigue
  if (!isApiPath(req.url) || req.headers.has('Authorization')) {
    return next(req);
  }

  const authService = inject(AuthService);
  const token = authService.getToken();
  if (!token) return next(req);

  const cloned = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(cloned);
};
