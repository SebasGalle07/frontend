import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { VehicleCardData } from '../vehicle-card/vehicle-card.component';

export type ReservationCardData = {
  id?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  comentarios?: string;
  vehicle?: VehicleCardData | null;
};

@Component({
  selector: 'app-reservation-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './reservation-card.component.html',
  styleUrl: './reservation-card.component.scss',
})
export class ReservationCardComponent {
  @Input({ required: true }) reservation!: ReservationCardData;
  @Input() isCancelling = false;
  @Input() showCancel = true;

  @Output() cancel = new EventEmitter<string>();

  onCancel(): void {
    if (!this.isCancelling && this.showCancel) {
      this.cancel.emit(String(this.reservation.id ?? ''));
    }
  }

  get statusBadge(): string {
    const status = (this.reservation.status ?? '').toLowerCase();
    if (status === 'cancelada') {
      return 'badge-muted';
    }
    if (status === 'confirmada') {
      return 'badge-positive';
    }
    return 'badge-neutral';
  }

  get startDate(): Date | null {
    return this.toDate(this.reservation.startDate ?? this.reservation.start_date);
  }

  get endDate(): Date | null {
    return this.toDate(this.reservation.endDate ?? this.reservation.end_date);
  }

  private toDate(value: unknown): Date | null {
    if (!value) {
      return null;
    }
    const date = value instanceof Date ? value : new Date(value as string);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}

