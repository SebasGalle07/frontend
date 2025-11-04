import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { VehicleService } from '../../../services/vehicle.service';

interface AdminVehicle {
  id: string;
  license_plate?: string;
  make?: string;
  model?: string;
  vehicle_type?: string;
  location?: string;
  status?: string;
  created_at?: string;
  validated_at?: string;
  images?: unknown;
  price_per_day?: number;
  currency?: string;
}

@Component({
  selector: 'app-admin-vehicles-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-vehicles.page.html',
  styleUrls: ['./admin-vehicles.page.scss'],
})
export class AdminVehiclesPage implements OnInit, OnDestroy {
  vehicles: AdminVehicle[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  statusFilter = 'todos';
  cityFilter = '';
  total = 0;
  limit = 25;
  offset = 0;
  updatingId: string | null = null;

  readonly statusOptions = [
    { value: 'todos', label: 'Todos' },
    { value: 'activo', label: 'Activos' },
    { value: 'inactivo', label: 'Inactivos' },
  ];

  private readonly destroy$ = new Subject<void>();

  constructor(private readonly vehicleService: VehicleService) {}

  ngOnInit(): void {
    this.loadVehicles();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  trackById(_: number, vehicle: AdminVehicle): string {
    return vehicle.id;
  }

  loadVehicles(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const params: Record<string, unknown> = {
      limit: this.limit,
      offset: this.offset,
    };
    if (this.statusFilter !== 'todos') {
      params['status'] = this.statusFilter;
    }
    if (this.cityFilter.trim()) {
      params['ciudad'] = this.cityFilter.trim();
    }

    this.vehicleService
      .listAdminVehicles(params)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isLoading = false;
        }),
      )
      .subscribe({
        next: (response) => {
          const items: AdminVehicle[] = this.resolveItems(response);
          this.vehicles = items;
          this.total = Number(response?.total ?? items.length);
          if (!items.length) {
            this.successMessage = '';
          }
        },
        error: (err) => {
          this.vehicles = [];
          this.total = 0;
          this.errorMessage =
            err?.error?.error ?? err?.message ?? 'No pudimos cargar los vehiculos.';
        },
      });
  }

  applyFilters(): void {
    this.offset = 0;
    this.loadVehicles();
  }

  resetFilters(): void {
    this.statusFilter = 'todos';
    this.cityFilter = '';
    this.applyFilters();
  }

  toggleStatus(vehicle: AdminVehicle): void {
    if (!vehicle?.id) {
      return;
    }

    const nextStatus = vehicle.status === 'activo' ? 'inactivo' : 'activo';
    this.updatingId = vehicle.id;
    this.errorMessage = '';
    this.successMessage = '';

    this.vehicleService
      .updateVehicleStatus(vehicle.id, nextStatus)
      .pipe(
        finalize(() => {
          this.updatingId = null;
        }),
      )
      .subscribe({
        next: (updated) => {
          vehicle.status = updated?.status ?? nextStatus;
          vehicle.validated_at = updated?.validated_at;
          const label = updated?.license_plate ?? vehicle.license_plate ?? vehicle.id;
          const statusLabel = nextStatus === 'activo' ? 'ACTIVO' : 'INACTIVO';
          this.successMessage = `El vehiculo ${label} ahora esta ${statusLabel}.`;
          this.scheduleMessageClear();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.error ?? err?.message ?? 'No pudimos actualizar el estado del vehiculo.';
        },
      });
  }

  formatStatus(status?: string): string {
    if (!status) {
      return 'Desconocido';
    }
    return status === 'activo' ? 'Activo' : 'Inactivo';
  }

  getVehicleImage(vehicle: AdminVehicle): string | null {
    const raw = (vehicle as any)?.images;
    if (Array.isArray(raw) && raw.length > 0) {
      const item = raw[0];
      if (typeof item === 'string' && item.trim()) {
        return item.trim();
      }
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const candidate = record['url'] ?? record['path'] ?? record['src'];
          if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
          }
        }
    } else if (typeof raw === 'string' && raw.trim()) {
      return raw.trim();
    }
    return null;
  }

  private resolveItems(response: any): AdminVehicle[] {
    const collection =
      Array.isArray(response?.items)
        ? response.items
        : Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.results)
        ? response.results
        : Array.isArray(response)
        ? response
        : [];

    return (collection as AdminVehicle[]).map((item) => ({
      id: item?.id ?? '',
      license_plate: item?.license_plate ?? undefined,
      make: item?.make ?? undefined,
      model: item?.model ?? undefined,
      vehicle_type: item?.vehicle_type ?? undefined,
      location: item?.location ?? undefined,
      status: item?.status ?? undefined,
      created_at: item?.created_at ?? undefined,
      validated_at: item?.validated_at ?? undefined,
      images: item?.images ?? undefined,
      price_per_day: item?.price_per_day ?? undefined,
      currency: item?.currency ?? undefined,
    }));
  }

  private scheduleMessageClear(): void {
    window.setTimeout(() => {
      this.successMessage = '';
    }, 3200);
  }
}

