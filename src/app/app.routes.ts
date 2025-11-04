import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { VehicleSearchComponent } from './pages/vehicle-search/vehicle-search.component';
import { ReservarPage } from './pages/reserva/reservar.page';
import { LoginPage } from './pages/auth/login.page';
import { RegisterPage } from './pages/auth/register.page';
import { ReservationDetailPage } from './pages/reservations/reservation-detail.page';
import { AdminVehiclesPage } from './pages/admin/vehicles/admin-vehicles.page';
import { AdminVehicleFormPage } from './pages/admin/vehicles/admin-vehicle-form.page';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'home', component: Home, canActivate: [authGuard] },
  { path: 'buscar', component: VehicleSearchComponent, canActivate: [authGuard] },
  { path: 'reservar/:vehicleId', component: ReservarPage, canActivate: [authGuard] },
  { path: 'reservas/:reservaId/detalle', component: ReservationDetailPage, canActivate: [authGuard] },
  {
    path: 'admin/vehicles',
    component: AdminVehiclesPage,
    canActivate: [authGuard, adminGuard],
  },
  {
    path: 'admin/vehicles/nuevo',
    component: AdminVehicleFormPage,
    canActivate: [authGuard, adminGuard],
  },
  { path: '**', redirectTo: 'home' },
];
