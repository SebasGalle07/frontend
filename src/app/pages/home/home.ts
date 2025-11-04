import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ReservasService } from '../../services/reservas.service';
import { VehicleCardComponent, VehicleCardData } from '../../components/vehicle-card/vehicle-card.component';
import { ReservationCardComponent, ReservationCardData } from '../../components/reservation-card/reservation-card.component';
import { VehicleService } from '../../services/vehicle.service';

type VehicleFilters = {
  ciudad: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
};

type ReservationItem = ReservationCardData & {
  id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  status: string;
  vehicle?: VehicleCardData | null;
};

type HealthStatus = {
  estado?: string;
  aplicacion?: string;
  entorno?: string;
  supabase?: {
    configurado?: boolean;
  };
  marca_de_tiempo?: string;
};

@Component({
  standalone: true,
  selector: 'app-home',
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
  imports: [CommonModule, FormsModule, RouterModule, VehicleCardComponent, ReservationCardComponent],
})
export class Home implements OnInit {
  filtros: VehicleFilters = {
    ciudad: '',
    tipo: '',
    fecha_inicio: '',
    fecha_fin: '',
  };

  destacados: any[] = [];
  isLoadingDestacados = false;
  errorDestacados = '';

  reservas: ReservationItem[] = [];
  isLoadingReservas = false;
  errorReservas = '';
  cancelandoId: string | null = null;
  cancelError = '';

  healthStatus: HealthStatus | null = null;
  isLoadingHealth = false;
  healthError = '';

  readonly destacadosMax = 3;

  constructor(
    private readonly router: Router,
    private readonly vehicleService: VehicleService,
    private readonly reservasService: ReservasService,
    private readonly apiService: ApiService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargarDestacados();
    this.consultarSalud();
    this.cargarReservas();
  }

  get estaAutenticado(): boolean {
    return this.authService.isLoggedIn();
  }

  get usuario(): { nombre?: string; rol?: string } | null {
    return this.authService.getProfile();
  }

  get hayReservas(): boolean {
    return this.reservas.length > 0;
  }

  get mostrarDestacadosSkeleton(): boolean {
    return this.isLoadingDestacados && !this.destacados.length;
  }

  buscar(): void {
    const queryParams: Record<string, string> = {};

    Object.entries(this.filtros).forEach(([key, value]) => {
      if (value) {
        queryParams[key] = value;
      }
    });

    this.router.navigate(['/buscar'], { queryParams });
  }

  cancelarReserva(reservaId: string): void {
    if (!reservaId) {
      return;
    }

    this.cancelandoId = reservaId;
    this.cancelError = '';

    this.reservasService.cancelarReserva(reservaId).subscribe({
      next: () => {
        this.cancelandoId = null;
        this.cargarReservas();
      },
      error: (err) => {
        this.cancelError =
          err?.error?.message ||
          err?.error?.detail ||
          'No pudimos cancelar la reserva. Intenta nuevamente.';
        this.cancelandoId = null;
      },
    });
  }

  private consultarSalud(): void {
    this.isLoadingHealth = true;
    this.healthError = '';

    this.apiService.ping().subscribe({
      next: (status) => {
        this.healthStatus = status;
        this.isLoadingHealth = false;
      },
      error: (err) => {
        this.healthError =
          err?.error?.message ||
          err?.error?.detail ||
          'No pudimos confirmar el estado del backend.';
        this.healthStatus = null;
        this.isLoadingHealth = false;
      },
    });
  }

  private cargarDestacados(): void {
    this.isLoadingDestacados = true;
    this.errorDestacados = '';

    this.vehicleService.getVehicles({ limit: this.destacadosMax }).subscribe({
      next: (response) => {
        this.destacados = this.resolveVehiclesResponse(response).slice(
          0,
          this.destacadosMax,
        );
        this.isLoadingDestacados = false;
      },
      error: (err) => {
        this.errorDestacados =
          err?.error?.message ||
          err?.error?.detail ||
          'No pudimos cargar los vehiculos destacados.';
        this.destacados = [];
        this.isLoadingDestacados = false;
      },
    });
  }

  private cargarReservas(): void {
    if (!this.authService.isLoggedIn()) {
      this.reservas = [];
      return;
    }

    this.isLoadingReservas = true;
    this.errorReservas = '';

    this.reservasService
      .listarReservas({ limit: 5 })
      .pipe(
        switchMap((response) => {
          const reservas = this.normalizeReservationsResponse(response);
          if (!reservas.length) {
            return of({ reservas, vehicles: new Map<string, any>() });
          }

          const vehicleIds = Array.from(
            new Set(reservas.map((item) => item.vehicle_id).filter(Boolean)),
          );

          if (!vehicleIds.length) {
            return of({ reservas, vehicles: new Map<string, any>() });
          }

          return forkJoin(
            vehicleIds.map((id) =>
              this.vehicleService.getVehicleById(id).pipe(
                map((vehicleResponse) => ({
                  id,
                  data: this.normalizeVehicleResponse(vehicleResponse),
                })),
              ),
            ),
          ).pipe(
            map((entries) => {
              const vehicles = new Map<string, any>();
              entries.forEach(({ id, data }) => {
                vehicles.set(id, data);
              });
              return { reservas, vehicles };
            }),
          );
        }),
      )
      .subscribe({
        next: ({ reservas, vehicles }) => {
          this.reservas = reservas.map((reserva) => ({
            ...reserva,
            vehicle: reserva.vehicle_id
              ? vehicles.get(reserva.vehicle_id)
              : null,
          }));
          this.isLoadingReservas = false;
        },
        error: (err) => {
          this.errorReservas =
            err?.error?.message ||
            err?.error?.detail ||
            'No pudimos cargar tus reservas.';
          this.reservas = [];
          this.isLoadingReservas = false;
        },
      });
  }

  private resolveVehiclesResponse(response: any): any[] {
    if (!response) {
      return [];
    }

    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response.items)) {
      return response.items;
    }

    if (Array.isArray(response.data)) {
      return response.data;
    }

    if (Array.isArray(response.results)) {
      return response.results;
    }

    return [];
  }

  private normalizeReservationsResponse(response: any): ReservationItem[] {
    const items = Array.isArray(response?.items)
      ? response.items
      : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.results)
      ? response.results
      : Array.isArray(response)
      ? response
      : [];

    return (items as any[])
      .map((item) => this.mapReservation(item))
      .filter((item): item is ReservationItem => item !== null);
  }

  private normalizeVehicleResponse(response: any): any {
    if (!response) {
      return null;
    }

    if (Array.isArray(response)) {
      return response[0] ?? null;
    }

    if (response.data) {
      if (Array.isArray(response.data)) {
        return response.data[0] ?? null;
      }
      return response.data;
    }

    if (response.item) {
      return response.item;
    }

    if (response.vehicle) {
      return response.vehicle;
    }

    return response;
  }

  private mapReservation(raw: any): ReservationItem | null {
    if (!raw) {
      return null;
    }

    const id = raw.id ?? raw.reservation_id;
    const vehicleId = raw.vehicle_id ?? raw.vehicleId ?? '';

    if (!id) {
      return null;
    }

    const startDateValue = raw.start_date ?? raw.startDate;
    const endDateValue = raw.end_date ?? raw.endDate;

    return {
      id: String(id),
      vehicle_id: String(vehicleId),
      start_date: startDateValue ?? '',
      end_date: endDateValue ?? '',
      status: String(raw.status ?? 'confirmada'),
      comentarios: raw.comentarios ?? undefined,
      startDate: this.toDate(startDateValue),
      endDate: this.toDate(endDateValue),
    };
  }

  private toDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    const parsed = new Date(value as string);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
