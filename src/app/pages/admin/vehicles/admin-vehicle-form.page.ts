import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { VehicleService } from '../../../services/vehicle.service';

@Component({
  selector: 'app-admin-vehicle-form-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './admin-vehicle-form.page.html',
  styleUrls: ['./admin-vehicle-form.page.scss'],
})
export class AdminVehicleFormPage implements OnDestroy {
  readonly minYear = 2015;
  readonly maxYear = new Date().getFullYear() + 1;
  readonly maxImageBytes = 3 * 1024 * 1024;
  readonly allowedTypes = ['image/jpeg', 'image/png'];

  private readonly fb = inject(FormBuilder);
  private readonly vehicleService = inject(VehicleService);
  private readonly router = inject(Router);

  form = this.fb.group({
    license_plate: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[A-Z]{3}\d{3}$|^[A-Z]{3}\d{2}[A-Z0-9]$/i),
      ],
    ],
    make: ['', [Validators.required, Validators.minLength(2)]],
    model: ['', [Validators.required, Validators.minLength(1)]],
    year: [
      new Date().getFullYear(),
      [Validators.required, Validators.min(this.minYear), Validators.max(this.maxYear)],
    ],
    vehicle_type: ['', Validators.required],
    price_per_day: ['', [Validators.required, Validators.min(1)]],
    location: ['', Validators.required],
    capacity: [''],
    descripcion: [''],
    owner_id: [''],
  });

  images: File[] = [];
  previews: string[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';

  private readonly objectUrls: string[] = [];

  ngOnDestroy(): void {
    this.objectUrls.forEach((url) => URL.revokeObjectURL(url));
  }

  get yearControl() {
    return this.form.controls.year;
  }

  get licenseControl() {
    return this.form.controls.license_plate;
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) {
      return;
    }

    this.clearImages();

    const files = Array.from(input.files);
    const errors: string[] = [];

    files.forEach((file) => {
      if (!this.allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: formato no soportado.`);
        return;
      }
      if (file.size > this.maxImageBytes) {
        errors.push(`${file.name}: excede el limite de 3MB.`);
        return;
      }

      this.images.push(file);
      const url = URL.createObjectURL(file);
      this.objectUrls.push(url);
      this.previews.push(url);
    });

    input.value = '';

    if (errors.length) {
      this.errorMessage = errors.join(' ');
    } else {
      this.errorMessage = '';
    }
  }

  removeImage(index: number): void {
    if (index < 0 || index >= this.images.length) {
      return;
    }
    const [removed] = this.objectUrls.splice(index, 1);
    if (removed) {
      URL.revokeObjectURL(removed);
    }
    this.images.splice(index, 1);
    this.previews.splice(index, 1);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.errorMessage = 'Revisa los datos del formulario.';
      return;
    }

    if (this.images.length === 0) {
      this.errorMessage = 'Debes adjuntar al menos una imagen del vehiculo.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = this.form.value;
    const formData = new FormData();

    formData.append('license_plate', this.uppercase(payload.license_plate));
    formData.append('make', (payload.make ?? '').trim());
    formData.append('model', (payload.model ?? '').trim());
    formData.append('year', String(payload.year));
    formData.append('vehicle_type', (payload.vehicle_type ?? '').trim());
    formData.append('price_per_day', String(payload.price_per_day));
    formData.append('location', (payload.location ?? '').trim());

    if (payload.descripcion) {
      formData.append('descripcion', payload.descripcion.trim());
    }

    if (payload.capacity) {
      formData.append('capacity', String(payload.capacity));
    }

    if (payload.owner_id) {
      formData.append('owner_id', payload.owner_id.trim());
    }

    this.images.forEach((file) => formData.append('images', file));

    this.vehicleService
      .createVehicle(formData)
      .pipe(
        finalize(() => {
          this.loading = false;
        }),
      )
      .subscribe({
        next: () => {
          this.successMessage =
            'Vehiculo registrado correctamente. Se encuentra en estado INACTIVO hasta su validacion.';
          this.resetForm();
          this.scheduleRedirect();
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.error ?? err?.message ?? 'No pudimos registrar el vehiculo.';
        },
      });
  }

  resetForm(): void {
    this.form.reset({
      year: new Date().getFullYear(),
      license_plate: '',
      make: '',
      model: '',
      vehicle_type: '',
      price_per_day: '',
      location: '',
      capacity: '',
      descripcion: '',
      owner_id: '',
    });
    this.clearImages();
  }

  private clearImages(): void {
    this.images = [];
    this.previews = [];
    while (this.objectUrls.length) {
      const url = this.objectUrls.pop();
      if (url) {
        URL.revokeObjectURL(url);
      }
    }
  }

  private uppercase(value: string | null | undefined): string {
    return (value ?? '').trim().toUpperCase();
  }

  private scheduleRedirect(): void {
    window.setTimeout(() => {
      this.router.navigate(['/admin/vehicles']);
    }, 1800);
  }
}
