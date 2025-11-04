import {
  Component,
  AfterViewInit,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgFor } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import * as maplibregl from 'maplibre-gl';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { VehicleService } from '../../services/vehicle.service';
import { VehicleCardComponent } from '../../components/vehicle-card/vehicle-card.component';

type Coordinates = { lat: number; lng: number };
type VehicleFilters = {
  ciudad: string;
  tipo: string;
  precio_min: string;
  precio_max: string;
};

@Component({
  selector: 'app-vehicle-search',
  standalone: true,
  imports: [FormsModule, CommonModule, NgFor, RouterModule, VehicleCardComponent],
  templateUrl: './vehicle-search.html',
  styleUrls: ['./vehicle-search.scss'],
})
export class VehicleSearchComponent
  implements OnInit, AfterViewInit, OnDestroy
{
  filters: VehicleFilters = {
    ciudad: '',
    tipo: '',
    precio_min: '',
    precio_max: '',
  };

  vehicles: any[] = [];
  isLoading = false;
  errorMessage = '';
  cities: string[] = [];

  map?: maplibregl.Map;
  markers: maplibregl.Marker[] = [];

  private readonly destroy$ = new Subject<void>();
  private suppressCityAutoSearch = false;
  private readonly defaultCenter: Coordinates = { lng: -74.0721, lat: 4.711 };
  private readonly cityCoords: Record<string, Coordinates> = {
    bogota: { lat: 4.711, lng: -74.0721 },
    medellin: { lat: 6.2518, lng: -75.5636 },
    armenia: { lat: 4.5339, lng: -75.6811 },
    cali: { lat: 3.4516, lng: -76.532 },
    barranquilla: { lat: 10.9685, lng: -74.7813 },
  };
  private readonly filterKeys: Array<keyof VehicleFilters> = [
    'ciudad',
    'tipo',
    'precio_min',
    'precio_max',
  ];

  constructor(
    private readonly vehicleService: VehicleService,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.vehicleService
      .getVehicleCities()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (cities) => {
          this.cities = cities;
        },
        error: () => {
          this.cities = [];
        },
      });

    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => {
        const nextFilters: VehicleFilters = { ...this.filters };

        this.filterKeys.forEach((key) => {
          const value = params.get(key);
          nextFilters[key] = value ?? '';
        });

        this.suppressCityAutoSearch = true;
        this.filters = nextFilters;
        this.buscar();
        setTimeout(() => {
          this.suppressCityAutoSearch = false;
        });
      });
  }

  ngAfterViewInit(): void {
    this.initMap();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.clearMarkers();
    this.map?.remove();
  }

  buscar(): void {
    this.isLoading = true;
    this.errorMessage = '';

    const filtros = { ...this.filters };
    const min = filtros.precio_min.trim();
    const max = filtros.precio_max.trim();

    if (min && max) {
      const minValue = Number.parseFloat(min);
      const maxValue = Number.parseFloat(max);
      if (!Number.isNaN(minValue) && !Number.isNaN(maxValue) && minValue > maxValue) {
        this.isLoading = false;
        this.errorMessage = 'El precio minimo no puede ser mayor al precio maximo.';
        return;
      }
    }

    this.vehicleService.getVehicles(filtros).subscribe({
      next: (response) => {
        this.vehicles = this.resolveVehiclesResponse(response);
        this.isLoading = false;

        if (!this.vehicles.length) {
          this.clearMarkers();
          return;
        }

        this.updateMapMarkers();
      },
      error: (err) => {
        this.isLoading = false;
        this.vehicles = [];
        this.clearMarkers();
        this.errorMessage =
          err?.error?.message ||
          err?.error?.detail ||
          'No pudimos cargar los vehiculos. Intenta nuevamente.';
      },
    });
  }

  onCityChange(): void {
    if (this.suppressCityAutoSearch) {
      return;
    }
    this.buscar();
  }

  resetFilters(): void {
    this.suppressCityAutoSearch = true;
    this.filters = {
      ciudad: '',
      tipo: '',
      precio_min: '',
      precio_max: '',
    };
    this.buscar();
    setTimeout(() => {
      this.suppressCityAutoSearch = false;
    });
  }

  private initMap(): void {
    this.map = new maplibregl.Map({
      container: 'map',
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [this.defaultCenter.lng, this.defaultCenter.lat],
      zoom: 12,
    });

    this.map.addControl(new maplibregl.NavigationControl(), 'top-right');
    this.map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: 'MapLibre, OpenMapTiles, OpenStreetMap',
      }),
      'bottom-right'
    );

    this.map.on('load', () => {
      if (this.vehicles.length) {
        this.updateMapMarkers();
      }
    });
  }

  private updateMapMarkers(): void {
    const map = this.map;

    if (!map) {
      return;
    }

    this.clearMarkers();

    const cityCoords = this.getCityCoordinates(this.filters.ciudad);
    const mapCenter = cityCoords ?? this.defaultCenter;
    map.setCenter([mapCenter.lng, mapCenter.lat]);

    this.vehicles.forEach((vehicle) => {
      const coords = this.getVehicleCoordinates(vehicle, cityCoords);
      const popupHtml = `
        <div class="popup-card">
          <strong>${vehicle.make ?? ''} ${vehicle.model ?? ''}</strong><br>
          <span>${vehicle.vehicle_type ?? ''} - $${vehicle.price_per_day ?? '--'}/dia</span><br>
          <small>${vehicle.city ?? vehicle.location ?? ''}</small>
        </div>
      `;

      const marker = new maplibregl.Marker({ color: '#d62828' })
        .setLngLat([coords.lng, coords.lat])
        .setPopup(
          new maplibregl.Popup({ closeButton: false, className: 'vehicle-popup' }).setHTML(popupHtml)
        );

      marker.addTo(map);
      this.markers.push(marker);
    });
  }

  private clearMarkers(): void {
    this.markers.forEach((marker) => marker.remove());
    this.markers = [];
  }

  get selectedCityLabel(): string {
    return this.filters.ciudad?.trim() || 'Todas las ciudades';
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

  private getCityCoordinates(city?: string): Coordinates | undefined {
    if (!city) {
      return undefined;
    }

    const normalized = this.normalizeCity(city);
    return this.cityCoords[normalized];
  }

  private getVehicleCoordinates(
    vehicle: any,
    fallback?: Coordinates
  ): Coordinates {
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

    return fallback ?? this.defaultCenter;
  }

  private toNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number.parseFloat(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
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
}
