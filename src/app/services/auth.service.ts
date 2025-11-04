import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

type AuthResponse = {
  access_token?: string;
  id?: string;
  email?: string;
  nombre?: string;
  rol?: string;
  [key: string]: unknown;
};

type RegisterPayload = {
  nombre: string;
  email: string;
  password: string;
  rol: string;
  telefono?: string;
};

type UserProfile = {
  id?: string;
  email?: string;
  nombre?: string;
  rol?: string;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'access_token';
  private readonly profileKey = 'autoshare_profile';

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/login', { email, password })
      .pipe(tap((res) => this.storeSession(res)));
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>('/api/auth/register', payload)
      .pipe(tap((res) => this.storeSession(res)));
  }

  logout(): void {
    this.clearSession();
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getProfile(): UserProfile | null {
    const raw = localStorage.getItem(this.profileKey);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      this.clearSession();
      return null;
    }
  }

  hasRole(role: string | string[]): boolean {
    const profile = this.getProfile();
    const currentRole = profile?.rol?.toLowerCase();
    if (!currentRole) {
      return false;
    }

    const roles = Array.isArray(role) ? role : [role];
    return roles.some((target) => target.toLowerCase() === currentRole);
  }

  isAdmin(): boolean {
    return this.hasRole('administrador');
  }

  private storeSession(data: AuthResponse): void {
    if (data?.access_token) {
      localStorage.setItem(this.tokenKey, data.access_token);
    }

    const profile: UserProfile = {
      id: data?.id as string | undefined,
      email: data?.email as string | undefined,
      nombre: data?.nombre as string | undefined,
      rol: data?.rol as string | undefined,
    };

    const hasProfileData = Object.values(profile).some(
      (value) => value !== undefined && value !== null && value !== '',
    );

    if (hasProfileData) {
      localStorage.setItem(this.profileKey, JSON.stringify(profile));
    } else {
      localStorage.removeItem(this.profileKey);
    }
  }

  private clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.profileKey);
  }
}
