import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  standalone: true,
  selector: 'app-register-page',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  imports: [CommonModule, FormsModule, RouterModule],
})
export class RegisterPage {
  nombre = '';
  email = '';
  password = '';
  confirmPassword = '';
  telefono = '';
  rol = 'cliente';

  error = '';
  success = '';
  isLoading = false;

  readonly roles = [
    {
      value: 'cliente',
      label: 'Cliente',
      description:
        'Reserva vehiculos, gestiona sus propias reservas y realiza pagos.',
    },
    {
      value: 'anfitrion',
      label: 'Anfitrion',
      description:
        'Publica vehiculos y administra su disponibilidad. No crea reservas.',
    },
  ];

  constructor(private auth: AuthService, private router: Router) {}

  register(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.error = 'Las contrasenas no coinciden.';
      return;
    }

    this.error = '';
    this.success = '';
    this.isLoading = true;

    const payload: {
      nombre: string;
      email: string;
      password: string;
      rol: string;
      telefono?: string;
    } = {
      nombre: this.nombre.trim(),
      email: this.email.trim(),
      password: this.password,
      rol: this.rol,
    };

    const telefonoLimpio = this.telefono.trim();
    if (telefonoLimpio) {
      payload.telefono = telefonoLimpio;
    }

    this.auth
      .register(payload)
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.success = 'Registro exitoso. Te redirigiremos al inicio.';
          form.resetForm({
            rol: 'cliente',
          });
          this.rol = 'cliente';
          this.nombre = '';
          this.email = '';
          this.password = '';
          this.confirmPassword = '';
          this.telefono = '';
          setTimeout(() => this.router.navigate(['/home']), 1500);
        },
        error: (err) => {
          this.isLoading = false;
          this.error =
            err?.error?.message ||
            err?.error?.detail ||
            'No pudimos completar el registro. Intenta nuevamente.';
        },
      });
  }
}
