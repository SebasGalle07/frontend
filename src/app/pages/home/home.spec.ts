import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ReservasService } from '../../services/reservas.service';
import { VehicleService } from '../../services/vehicle.service';
import { Home } from './home';

describe('Home', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;

  const vehicleServiceStub = {
    getVehicles: jasmine.createSpy('getVehicles').and.returnValue(
      of({ items: [] }),
    ),
    getVehicleById: jasmine.createSpy('getVehicleById').and.returnValue(of(null)),
  };

  const reservasServiceStub = {
    listarReservas: jasmine
      .createSpy('listarReservas')
      .and.returnValue(of({ items: [] })),
    cancelarReserva: jasmine.createSpy('cancelarReserva').and.returnValue(of({})),
  };

  const apiServiceStub = {
    ping: jasmine.createSpy('ping').and.returnValue(
      of({
        estado: 'operativo',
        supabase: { configurado: true },
      }),
    ),
  };

  const authServiceStub = {
    isLoggedIn: jasmine.createSpy('isLoggedIn').and.returnValue(false),
    getProfile: jasmine.createSpy('getProfile').and.returnValue(null),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        { provide: VehicleService, useValue: vehicleServiceStub },
        { provide: ReservasService, useValue: reservasServiceStub },
        { provide: ApiService, useValue: apiServiceStub },
        { provide: AuthService, useValue: authServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
