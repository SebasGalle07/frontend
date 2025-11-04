import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { RouterModule } from '@angular/router';

export type VehicleCardData = {
  id?: string;
  make?: string;
  model?: string;
  vehicle_type?: string;
  vehicleType?: string;
  price_per_day?: number | string;
  pricePerDay?: number | string;
  currency?: string;
  city?: string;
  location?: string;
  capacity?: number | string;
  seats?: number | string;
  transmission?: string;
  fuel_type?: string;
  fuelType?: string;
  description?: string;
  license_plate?: string;
  status?: string;
  images?: Array<{ url?: string; src?: string; path?: string }> | string[];
};

@Component({
  selector: 'app-vehicle-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './vehicle-card.component.html',
  styleUrl: './vehicle-card.component.scss',
})
export class VehicleCardComponent implements OnChanges {
  @Input({ required: true }) vehicle!: VehicleCardData;
  @Input() actionLabel = 'Reservar';
  @Input() actionLink: string | any[] | null = null;
  @Input() highlight = false;

  private cachedImages: string[] | null = null;

  ngOnChanges(_changes: SimpleChanges): void {
    this.cachedImages = null;
  }

  get displayLocation(): string {
    return (
      this.vehicle.city ??
      this.vehicle.location ??
      'Sin ciudad'
    );
  }

  get pricePerDay(): string {
    const price = this.vehicle.price_per_day ?? this.vehicle.pricePerDay;
    if (price === undefined || price === null) {
      return '--';
    }
    const numeric = Number(price);
    return Number.isFinite(numeric) ? numeric.toFixed(0) : String(price);
  }

  get currency(): string {
    const currency = (this.vehicle.currency as string) ?? 'USD';
    return currency.toUpperCase();
  }

  get seatCount(): string {
    const value = this.vehicle.capacity ?? this.vehicle.seats;
    return value !== undefined && value !== null ? String(value) : '?';
  }

  get coverImage(): string | null {
    const images = this.resolveImages();
    if (images.length === 0) {
      return null;
    }
    return images[0];
  }

  get displayPlate(): string | null {
    const plate = (this.vehicle as any).license_plate ?? (this.vehicle as any).plate;
    if (typeof plate !== 'string') {
      return null;
    }
    const normalized = plate.trim().toUpperCase();
    return normalized.length > 0 ? normalized : null;
  }

  private resolveImages(): string[] {
    if (this.cachedImages !== null) {
      return this.cachedImages;
    }

    const raw =
      (this.vehicle as any)?.images ??
      (this.vehicle as any)?.image_urls ??
      (this.vehicle as any)?.photos;

    const images: string[] = [];
    if (Array.isArray(raw)) {
      raw.forEach((item) => {
        if (typeof item === 'string') {
          const trimmed = item.trim();
          if (trimmed) {
            images.push(trimmed);
          }
          return;
        }
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const candidate = record['url'] ?? record['src'] ?? record['path'];
          if (typeof candidate === 'string' && candidate.trim()) {
            images.push(candidate.trim());
          }
        }
      });
    } else if (typeof raw === 'string' && raw.trim()) {
      images.push(raw.trim());
    }

    this.cachedImages = images;
    return images;
  }
}
