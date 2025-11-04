import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ReservasService } from '../../services/reservas.service';
import { VehicleService } from '../../services/vehicle.service';
import { ReservarPage } from './reservar.page';

describe('ReservarPage', () => {
  let component: ReservarPage;
  let fixture: ComponentFixture<ReservarPage>;

  const reservasServiceStub = {
    crearReserva: jasmine.createSpy('crearReserva').and.returnValue(of({})),
  };

  const vehicleServiceStub = {
    getVehicleById: jasmine.createSpy('getVehicleById').and.returnValue(of(null)),
  };

  const authServiceStub = {
    isLoggedIn: jasmine.createSpy('isLoggedIn').and.returnValue(false),
  };

  const routerStub = {
    navigate: jasmine.createSpy('navigate'),
  };

  const activatedRouteStub = {
    snapshot: {
      paramMap: {
        get: () => 'vehiculo-1',
      },
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReservarPage],
      providers: [
        { provide: ReservasService, useValue: reservasServiceStub },
        { provide: VehicleService, useValue: vehicleServiceStub },
        { provide: AuthService, useValue: authServiceStub },
        { provide: Router, useValue: routerStub },
        { provide: ActivatedRoute, useValue: activatedRouteStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReservarPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
