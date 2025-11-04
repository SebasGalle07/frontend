import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import * as maplibregl from 'maplibre-gl';
import { AuthService } from '../../services/auth.service';
import { ReservasService } from '../../services/reservas.service';

type ReservationViewModel = {
  id: string;
  status: string;
  startDateIso: string;
  endDateIso: string;
  startDate: Date | null;
  endDate: Date | null;
  comentarios?: string;
  duracionDias: number;
};

type VehicleViewModel = {
  id?: string;
  make?: string;
  model?: string;
  vehicle_type?: string;
  price_per_day?: number | string;
  pricePerDay?: number | string;
  currency?: string;
  year?: number | string;
  location?: string;
  city?: string;
  capacity?: number | string;
  image_url?: string;
};

type Coordinates = { lat: number; lng: number };

@Component({
  selector: 'app-reservation-detail-page',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './reservation-detail.page.html',
  styleUrls: ['./reservation-detail.page.scss'],
})
export class ReservationDetailPage implements OnInit, AfterViewInit, OnDestroy {
  reservaId = '';
  isLoading = true;
  error = '';

  reserva: ReservationViewModel | null = null;
  vehicle: VehicleViewModel | null = null;
  usuario: ReturnType<AuthService['getProfile']> | null = null;

  private map?: maplibregl.Map;
  private marker?: maplibregl.Marker;
  private readonly defaultCenter: Coordinates = { lng: -74.0721, lat: 4.711 };
  private readonly cityCoords: Record<string, Coordinates> = {
    bogota: { lat: 4.711, lng: -74.0721 },
    medellin: { lat: 6.2518, lng: -75.5636 },
    armenia: { lat: 4.5339, lng: -75.6811 },
    cali: { lat: 3.4516, lng: -76.532 },
    barranquilla: { lat: 10.9685, lng: -74.7813 },
    cartagena: { lat: 10.391, lng: -75.4794 },
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly reservasService: ReservasService,
    private readonly authService: AuthService,
  ) {
    this.usuario = this.authService.getProfile();
  }

  ngOnInit(): void {
    this.reservaId = this.route.snapshot.paramMap.get('reservaId') ?? '';

    if (!this.reservaId) {
      this.error = 'Identificador de reserva invalido.';
      this.isLoading = false;
      return;
    }

    this.cargarDetalle();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
    this.marker = undefined;
  }

  get estadoEtiqueta(): string {
    const estado = (this.reserva?.status ?? '').toLowerCase();
    if (estado === 'confirmada') {
      return 'Confirmada';
    }
    if (estado === 'cancelada') {
      return 'Cancelada';
    }
    if (estado === 'completada') {
      return 'Completada';
    }
    return estado || 'Sin estado';
  }

  get estadoClase(): string {
    const estado = (this.reserva?.status ?? '').toLowerCase();
    if (estado === 'confirmada') {
      return 'badge-positive';
    }
    if (estado === 'cancelada') {
      return 'badge-muted';
    }
    return 'badge-neutral';
  }

  get costoTotal(): number | null {
    if (!this.vehicle || !this.reserva) {
      return null;
    }

    const dias = this.reserva.duracionDias;
    if (!dias || dias <= 0) {
      return null;
    }

    const price =
      this.toNumber(this.vehicle.price_per_day) ??
      this.toNumber(this.vehicle.pricePerDay);

    if (price === undefined) {
      return null;
    }

    return price * dias;
  }

  get etiquetaUbicacion(): string {
    return (
      this.vehicle?.location ??
      this.vehicle?.city ??
      'Ubicacion por confirmar'
    );
  }

  volver(): void {
    this.router.navigate(['/home']);
  }

  private cargarDetalle(): void {
    this.isLoading = true;
    this.error = '';

    this.reservasService.obtenerReserva(this.reservaId).subscribe({
      next: (response) => {
        this.reserva = this.normalizeReservation(response?.reserva);
        this.vehicle = this.normalizeVehicle(response?.vehicle);
        this.isLoading = false;
        this.updateMapMarker();
      },
      error: (err) => {
        this.error =
          err?.error?.message ||
          err?.error?.detail ||
          'No pudimos recuperar el detalle de esta reserva.';
        this.isLoading = false;
      },
    });
  }

  private initMap(): void {
    if (this.map) {
      return;
    }

    this.map = new maplibregl.Map({
      container: 'reservation-map',
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [this.defaultCenter.lng, this.defaultCenter.lat],
      zoom: 12,
    });

    this.map.addControl(new maplibregl.NavigationControl(), 'top-right');
    this.map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: 'MapLibre / OpenStreetMap',
      }),
      'bottom-right',
    );

    this.map.on('load', () => this.updateMapMarker());
  }

  private updateMapMarker(): void {
    if (!this.map || !this.vehicle) {
      return;
    }

    if (!this.map.loaded()) {
      this.map.once('load', () => this.updateMapMarker());
      return;
    }

    const coords = this.getVehicleCoordinates(this.vehicle);
    this.map.setCenter([coords.lng, coords.lat]);

    this.marker?.remove();
    this.marker = new maplibregl.Marker({ color: '#1f2937' })
      .setLngLat([coords.lng, coords.lat])
      .setPopup(
        new maplibregl.Popup({ closeButton: false }).setHTML(
          `<strong>Punto de encuentro</strong><br>${this.etiquetaUbicacion}`,
        ),
      )
      .addTo(this.map);
  }

  private normalizeReservation(raw: any): ReservationViewModel | null {
    if (!raw) {
      return null;
    }

    const id = raw.id ?? raw.reserva_id ?? raw.reservation_id;
    if (!id) {
      return null;
    }

    const startIso = this.normalizeDate(raw.start_date ?? raw.startDate);
    const endIso = this.normalizeDate(raw.end_date ?? raw.endDate);
    const startDate = this.toDate(startIso);
    const endDate = this.toDate(endIso);

    let duracionDias = 0;
    if (startDate && endDate) {
      const diff = endDate.getTime() - startDate.getTime();
      duracionDias = Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
    }

    return {
      id: String(id),
      status: String(raw.status ?? 'confirmada').toLowerCase(),
      startDateIso: startIso ?? '',
      endDateIso: endIso ?? '',
      startDate,
      endDate,
      comentarios: raw.comentarios ?? raw.commentarios ?? undefined,
      duracionDias: Math.max(duracionDias, 0),
    };
  }

  private normalizeVehicle(raw: any): VehicleViewModel | null {
    if (!raw) {
      return null;
    }

    return {
      id: raw.id ?? raw.vehicle_id ?? raw.vehicleId,
      make: raw.make,
      model: raw.model,
      vehicle_type: raw.vehicle_type ?? raw.vehicleType,
      price_per_day: raw.price_per_day ?? raw.pricePerDay,
      pricePerDay: raw.pricePerDay,
      currency: raw.currency ?? 'USD',
      year: raw.year,
      location: raw.location,
      city: raw.city,
      capacity: raw.capacity,
      image_url: raw.image_url ?? raw.imageUrl,
    };
  }

  private getVehicleCoordinates(vehicle: VehicleViewModel): Coordinates {
    const lat =
      this.toNumber((vehicle as any)?.lat) ??
      this.toNumber((vehicle as any)?.latitude);
    const lng =
      this.toNumber((vehicle as any)?.lng) ??
      this.toNumber((vehicle as any)?.long) ??
      this.toNumber((vehicle as any)?.longitude);

    if (lat !== undefined && lng !== undefined) {
      return { lat, lng };
    }

    const fallback =
      this.getCityCoordinates(vehicle.location) ??
      this.getCityCoordinates(vehicle.city);

    return fallback ?? this.defaultCenter;
  }

  private getCityCoordinates(value?: string | null): Coordinates | undefined {
    if (!value) {
      return undefined;
    }

    const normalized = this.normalizeCity(value);
    if (this.cityCoords[normalized]) {
      return this.cityCoords[normalized];
    }

    const firstToken = normalized.split(/[,-]/)[0]?.trim();
    if (firstToken && this.cityCoords[firstToken]) {
      return this.cityCoords[firstToken];
    }

    return undefined;
  }

  private normalizeCity(city: string): string {
    return city
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private toDate(value: unknown): Date | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (value instanceof Date) {
      const clone = new Date(value.getTime());
      return Number.isNaN(clone.getTime()) ? null : clone;
    }

    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }

  private toNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
    return undefined;
  }

  private normalizeDate(value: unknown): string | null {
    if (!value) {
      return null;
    }
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return value;
    }
    const date = this.toDate(value);
    if (!date) {
      return null;
    }
    return date.toISOString().split('T')[0];
  }
}
