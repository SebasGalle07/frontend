import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class VehicleService {
  private readonly baseUrl = '/api/vehicles';
  private readonly adminUrl = '/api/admin/vehicles';

  constructor(private http: HttpClient) {}

  getVehicles(filters?: Record<string, unknown>): Observable<any> {
    const params = this.buildParams(filters);
    return this.http.get(this.baseUrl, { params });
  }

  getVehicleById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }

  getVehicleAvailability(id: string, includePast = false): Observable<{ vehicle_id: string; reservations: any[] }> {
    let params = new HttpParams();
    if (includePast) {
      params = params.set('include_past', 'true');
    }

    return this.http.get<{ vehicle_id: string; reservations: any[] }>(`${this.baseUrl}/${id}/availability`, {
      params,
    });
  }

  getVehicleCities(): Observable<string[]> {
    return this.http.get<{ items?: unknown }>(`${this.baseUrl}/cities`).pipe(
      map((response) => {
        const items = (response?.items ?? []) as unknown;
        if (!Array.isArray(items)) {
          return [];
        }
        return items
          .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          .map((item) => item.trim());
      }),
    );
  }

  createVehicle(payload: FormData): Observable<any> {
    return this.http.post(this.baseUrl, payload);
  }

  listAdminVehicles(filters?: Record<string, unknown>): Observable<any> {
    const params = this.buildParams(filters);
    return this.http.get(this.adminUrl, { params });
  }

  getAdminVehicle(id: string): Observable<any> {
    return this.http.get(`${this.adminUrl}/${id}`);
  }

  updateVehicleStatus(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.baseUrl}/${id}/status`, { status });
  }

  private buildParams(filters?: Record<string, unknown>): HttpParams {
    let params = new HttpParams();

    if (!filters) {
      return params;
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }

      const normalizedValue =
        typeof value === 'string' ? value.trim() : value.toString();

      if (normalizedValue !== '') {
        params = params.set(this.normalizeKey(key), normalizedValue);
      }
    });

    return params;
  }

  private normalizeKey(key: string): string {
    return key
      .replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
      .toLowerCase();
  }
}
