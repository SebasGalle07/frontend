import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm, NgModel } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ReservasService } from '../../services/reservas.service';
import { VehicleService } from '../../services/vehicle.service';
import { AuthService } from '../../services/auth.service';
import * as maplibregl from 'maplibre-gl';

type ReservaForm = {
  start_date: string;
  end_date: string;
  metodo_pago: string;
  card_last4: string;
  comentarios: string;
};

type AvailabilityRange = {
  id?: string;
  start_date: string;
  end_date: string;
  status?: string;
};

type Coordinates = { lat: number; lng: number };

@Component({
  selector: 'app-reservar-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reservar.page.html',
  styleUrls: ['./reservar.page.scss'],
})
export class ReservarPage implements OnInit, AfterViewInit, OnDestroy {
  reserva: ReservaForm = {
    start_date: '',
    end_date: '',
    metodo_pago: 'tarjeta',
    card_last4: '',
    comentarios: '',
  };

  vehicleId = '';
  vehicle: any = null;
  vehicleError = '';
  mensaje = '';
  mensajeTipo: 'success' | 'danger' | '' = '';
  cargando = false;
  isLoadingVehicle = true;
  availabilityRanges: AvailabilityRange[] = [];
  isLoadingAvailability = true;
  availabilityError = '';
  availabilityMessage = '';
  availabilityMessageType: 'info' | 'danger' | '' = '';

  readonly minStartDate = new Date().toISOString().split('T')[0];
  private map?: maplibregl.Map;
  private pickupMarker?: maplibregl.Marker;
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
    private readonly vehicleService: VehicleService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.vehicleId = this.route.snapshot.paramMap.get('vehicleId') ?? '';

    if (!this.vehicleId) {
      this.vehicleError = 'Identificador de vehiculo invalido.';
      this.isLoadingVehicle = false;
      return;
    }

    this.loadVehicle();
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.map?.remove();
    this.map = undefined;
    this.pickupMarker = undefined;
  }

  get minEndDate(): string {
    return this.reserva.start_date || this.minStartDate;
  }

  get pickupLocationLabel(): string {
    if (this.vehicle?.location) {
      return String(this.vehicle.location);
    }
    if (this.vehicle?.city) {
      return String(this.vehicle.city);
    }
    return 'Ubicacion por confirmar';
  }

  get vehicleImages(): string[] {
    return this.extractImages(this.vehicle);
  }

  reservar(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    if (!this.authService.isLoggedIn()) {
      this.mensajeTipo = 'danger';
      this.mensaje = 'Debes iniciar sesion para completar la reserva.';
      return;
    }

    if (this.hasConflict(this.reserva.start_date, this.reserva.end_date)) {
      this.mensajeTipo = 'danger';
      this.mensaje = 'El vehiculo ya esta reservado en ese rango de fechas.';
      return;
    }

    if (this.compareDates(this.reserva.end_date, this.reserva.start_date) < 0) {
      this.mensajeTipo = 'danger';
      this.mensaje = 'La fecha de entrega no puede ser anterior a la fecha de inicio.';
      return;
    }

    const payload: Record<string, unknown> = {
      vehicle_id: this.vehicleId,
      start_date: this.reserva.start_date,
      end_date: this.reserva.end_date,
      metodo_pago: this.reserva.metodo_pago,
    };

    const comentarios = this.reserva.comentarios.trim();
    if (comentarios) {
      payload['comentarios'] = comentarios;
    }

    if (this.reserva.metodo_pago === 'tarjeta') {
      payload['card_last4'] = this.reserva.card_last4.trim();
    }

    this.cargando = true;
    this.mensaje = '';
    this.mensajeTipo = '';
    this.clearAvailabilityMessage();

    this.reservasService.crearReserva(payload).subscribe({
      next: (response) => {
        this.cargando = false;
        this.mensaje = 'Reserva creada con exito.';
        this.mensajeTipo = 'success';
        form.resetForm({
          start_date: '',
          end_date: '',
          metodo_pago: 'tarjeta',
          card_last4: '',
          comentarios: '',
        });
        this.reserva.metodo_pago = 'tarjeta';
        this.reserva.card_last4 = '';
        this.loadAvailability();

        const reservaId =
          response?.reserva?.id ||
          response?.reserva?.reservation_id ||
          response?.reserva?.reserva_id;

        const navigateTo = reservaId ? ['/reservas', reservaId, 'detalle'] : ['/home'];
        setTimeout(() => this.router.navigate(navigateTo), 600);
      },
      error: (err) => {
        this.mensaje =
          err?.error?.message ||
          err?.error?.detail ||
          'No pudimos crear la reserva. Intenta nuevamente.';
        this.mensajeTipo = 'danger';
        this.cargando = false;
      },
    });
  }

  onStartDateChange(value: string, startCtrl: NgModel, endCtrl: NgModel): void {
    this.clearAvailabilityMessage();
    this.updateModelError(startCtrl, 'conflict', false);
    this.updateModelError(startCtrl, 'range', false);
    this.updateModelError(endCtrl, 'conflict', false);
    this.updateModelError(endCtrl, 'range', false);

    if (!value) {
      return;
    }

    if (this.isDateBlocked(value)) {
      this.setAvailabilityMessage('danger', 'La fecha seleccionada ya cuenta con una reserva activa.');
      this.reserva.start_date = '';
      startCtrl.reset('');
      startCtrl.control.markAsTouched();
      this.updateModelError(startCtrl, 'conflict', true);
      return;
    }

    if (this.reserva.end_date) {
      if (this.compareDates(this.reserva.end_date, value) < 0) {
        this.setAvailabilityMessage('danger', 'La fecha de inicio debe ser anterior a la fecha de entrega.');
        startCtrl.control.markAsTouched();
        this.updateModelError(startCtrl, 'range', true);
        return;
      }

      if (this.hasConflict(value, this.reserva.end_date)) {
        this.setAvailabilityMessage('danger', 'El rango seleccionado se cruza con otra reserva.');
        startCtrl.control.markAsTouched();
        endCtrl.control.markAsTouched();
        this.updateModelError(startCtrl, 'conflict', true);
        this.updateModelError(endCtrl, 'conflict', true);
        return;
      }
    }

    endCtrl.control.updateValueAndValidity({ emitEvent: false });
  }

  onEndDateChange(value: string, startCtrl: NgModel, endCtrl: NgModel): void {
    this.clearAvailabilityMessage();
    this.updateModelError(endCtrl, 'conflict', false);
    this.updateModelError(endCtrl, 'range', false);
    this.updateModelError(startCtrl, 'conflict', false);
    this.updateModelError(startCtrl, 'range', false);

    if (!value) {
      return;
    }

    if (this.isDateBlocked(value)) {
      this.setAvailabilityMessage('danger', 'La fecha seleccionada ya cuenta con una reserva activa.');
      this.reserva.end_date = '';
      endCtrl.reset('');
      endCtrl.control.markAsTouched();
       this.updateModelError(endCtrl, 'conflict', true);
      return;
    }

    if (this.reserva.start_date) {
      if (this.compareDates(value, this.reserva.start_date) < 0) {
        this.setAvailabilityMessage('danger', 'La fecha de entrega no puede ser anterior a la fecha de inicio.');
        this.reserva.end_date = '';
        endCtrl.reset('');
        endCtrl.control.markAsTouched();
        this.updateModelError(endCtrl, 'range', true);
        return;
      }

      if (this.hasConflict(this.reserva.start_date, value)) {
        this.setAvailabilityMessage('danger', 'El rango seleccionado se cruza con otra reserva confirmada.');
        endCtrl.control.markAsTouched();
        this.updateModelError(endCtrl, 'conflict', true);
        this.updateModelError(startCtrl, 'conflict', true);
        return;
      }
    }
  }

  onMetodoPagoChange(value: string): void {
    if (value !== 'tarjeta') {
      this.reserva.card_last4 = '';
    }
  }

  private loadVehicle(): void {
    this.isLoadingVehicle = true;
    this.vehicleService.getVehicleById(this.vehicleId).subscribe({
      next: (response) => {
        this.vehicle = this.normalizeVehicleResponse(response);
        this.isLoadingVehicle = false;
        this.updateMapMarker();
        this.loadAvailability();
      },
      error: (err) => {
        this.vehicleError =
          err?.error?.message ||
          err?.error?.detail ||
          'No pudimos cargar la informacion de este vehiculo.';
        this.isLoadingVehicle = false;
        this.isLoadingAvailability = false;
      },
    });
  }

  private loadAvailability(): void {
    if (!this.vehicleId) {
      this.isLoadingAvailability = false;
      return;
    }

    this.isLoadingAvailability = true;
    this.availabilityError = '';

    this.vehicleService.getVehicleAvailability(this.vehicleId).subscribe({
      next: (response) => {
        const raw = Array.isArray(response?.reservations) ? response.reservations : [];
        this.availabilityRanges = raw
          .map((item: any) => {
            const start = this.normalizeDate(item?.start_date);
            const end = this.normalizeDate(item?.end_date);
            if (!start || !end) {
              return null;
            }
            const status = String(item?.status ?? 'confirmada').toLowerCase();
            return {
              id: item?.id ? String(item.id) : undefined,
              start_date: start,
              end_date: end,
              status,
            } as AvailabilityRange;
          })
          .filter((item): item is AvailabilityRange => item !== null && item.status !== 'cancelada')
          .sort((a, b) => this.compareDates(a.start_date, b.start_date));

        this.isLoadingAvailability = false;
      },
      error: (err) => {
        this.availabilityRanges = [];
        this.availabilityError =
          err?.error?.message ||
          err?.error?.detail ||
          'No pudimos obtener la disponibilidad del vehiculo.';
        this.isLoadingAvailability = false;
      },
    });
  }

  private initMap(): void {
    if (this.map) {
      return;
    }

    this.map = new maplibregl.Map({
      container: 'pickup-map',
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

    this.pickupMarker?.remove();
    this.pickupMarker = new maplibregl.Marker({ color: '#2d3142' })
      .setLngLat([coords.lng, coords.lat])
      .setPopup(
        new maplibregl.Popup({ closeButton: false }).setHTML(
          `<strong>Punto de entrega</strong><br>${this.pickupLocationLabel}`,
        ),
      )
      .addTo(this.map);
  }

  private getVehicleCoordinates(vehicle: any): Coordinates {
    const lat =
      this.toNumber(vehicle?.lat) ??
      this.toNumber(vehicle?.latitude) ??
      this.toNumber(vehicle?.location?.lat) ??
      this.toNumber(vehicle?.location?.latitude);
    const lng =
      this.toNumber(vehicle?.lng) ??
      this.toNumber(vehicle?.long) ??
      this.toNumber(vehicle?.longitude) ??
      this.toNumber(vehicle?.location?.lng) ??
      this.toNumber(vehicle?.location?.lon) ??
      this.toNumber(vehicle?.location?.longitude);

    if (lat !== undefined && lng !== undefined) {
      return { lat, lng };
    }

    const fallback =
      this.getCityCoordinates(vehicle?.location) ||
      this.getCityCoordinates(vehicle?.city);

    return fallback ?? this.defaultCenter;
  }

  private getCityCoordinates(value: unknown): Coordinates | undefined {
    if (typeof value !== 'string' || !value.trim()) {
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

  private isDateBlocked(value: string): boolean {
    const target = this.toDate(value);
    if (!target) {
      return false;
    }

    return this.availabilityRanges.some((range) => {
      const start = this.toDate(range.start_date);
      const end = this.toDate(range.end_date);
      if (!start || !end) {
        return false;
      }
      return this.overlapsRange(target, target, start, end);
    });
  }

  private hasConflict(startValue: string, endValue: string): boolean {
    const start = this.toDate(startValue);
    const end = this.toDate(endValue);

    if (!start || !end) {
      return false;
    }

    return this.availabilityRanges.some((range) => {
      const rangeStart = this.toDate(range.start_date);
      const rangeEnd = this.toDate(range.end_date);
      if (!rangeStart || !rangeEnd) {
        return false;
      }
      return this.overlapsRange(start, end, rangeStart, rangeEnd);
    });
  }

  private overlapsRange(start: Date, end: Date, rangeStart: Date, rangeEnd: Date): boolean {
    return start <= rangeEnd && end >= rangeStart;
  }

  private toDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      const clone = new Date(value.getTime());
      clone.setHours(0, 0, 0, 0);
      return Number.isNaN(clone.getTime()) ? null : clone;
    }

    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    parsed.setHours(0, 0, 0, 0);
    return parsed;
  }

  private compareDates(a: string, b: string): number {
    const dateA = this.toDate(a);
    const dateB = this.toDate(b);
    if (!dateA || !dateB) {
      return 0;
    }
    return dateA.getTime() - dateB.getTime();
  }

  private normalizeDate(value: unknown): string | null {
    const date = this.toDate(value);
    if (!date) {
      return null;
    }
    return date.toISOString().split('T')[0];
  }

  private setAvailabilityMessage(type: 'info' | 'danger', message: string): void {
    this.availabilityMessageType = type;
    this.availabilityMessage = message;
  }

  private clearAvailabilityMessage(): void {
    this.availabilityMessageType = '';
    this.availabilityMessage = '';
  }

  private updateModelError(model: NgModel, key: string, active: boolean): void {
    if (!model?.control) {
      return;
    }

    const current = { ...(model.control.errors ?? {}) };

    if (active) {
      current[key] = true;
    } else {
      delete current[key];
    }

    const hasErrors = Object.keys(current).length > 0 ? current : null;
    model.control.setErrors(hasErrors);
  }

  private extractImages(source: any): string[] {
    if (!source) {
      return [];
    }

    const raw = source?.images ?? source?.image_urls ?? source?.photos;
    const result: string[] = [];

    if (Array.isArray(raw)) {
      raw.forEach((item) => {
        if (typeof item === 'string') {
          const trimmed = item.trim();
          if (trimmed) {
            result.push(trimmed);
          }
          return;
        }
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const candidate = record['url'] ?? record['path'] ?? record['src'];
          if (typeof candidate === 'string' && candidate.trim()) {
            result.push(candidate.trim());
          }
        }
      });
    } else if (typeof raw === 'string' && raw.trim()) {
      result.push(raw.trim());
    }

    return result.slice(0, 4);
  }

  private normalizeVehicleResponse(response: any): any {
    if (!response) {
      return null;
    }

    if (response.data && typeof response.data === 'object') {
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
}
