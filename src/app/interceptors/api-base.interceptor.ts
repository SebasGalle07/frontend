import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';

export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  // solo tocar URLs que empiecen por /api
  if (req.url.startsWith('/api')) {
    const url = environment.apiBase.replace(/\/$/, '') + req.url; // evita doble //
    req = req.clone({ url /* , withCredentials: true */ }); // activa withCredentials si usas cookies
  }
  return next(req);
};
