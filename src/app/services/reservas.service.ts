import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

type ReservasQuery = {
  limit?: number;
  offset?: number;
};

@Injectable({ providedIn: 'root' })
export class ReservasService {
  private readonly baseUrl = '/api/reservations';

  constructor(private http: HttpClient) {}

  crearReserva(payload: Record<string, unknown>): Observable<any> {
    return this.http.post(this.baseUrl, payload);
  }

  listarReservas(query?: ReservasQuery): Observable<any> {
    let params = new HttpParams();

    if (query?.limit !== undefined) {
      params = params.set('limit', String(query.limit));
    }

    if (query?.offset !== undefined) {
      params = params.set('offset', String(query.offset));
    }

    return this.http.get(this.baseUrl, { params });
  }

  cancelarReserva(reservaId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/${reservaId}/cancel`, {});
  }

  obtenerReserva(reservaId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${reservaId}`);
  }
}
