import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './interceptors/auth.interceptor';
import { apiBaseInterceptor } from './interceptors/api-base.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        apiBaseInterceptor, // primero: convierte /api -> https://aaa.../api
        authInterceptor     // después: añade Authorization
      ])
    ),
  ],
};
