import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import * as maplibregl from 'maplibre-gl';
import { VehicleService } from '../../services/vehicle.service';
import { VehicleSearchComponent } from './vehicle-search.component';

describe('VehicleSearchComponent', () => {
  let component: VehicleSearchComponent;
  let fixture: ComponentFixture<VehicleSearchComponent>;

  const vehicleServiceStub = {
    getVehicles: jasmine.createSpy('getVehicles').and.returnValue(
      of({ items: [] }),
    ),
    getVehicleById: jasmine.createSpy('getVehicleById').and.returnValue(of(null)),
  };

  const routeStub = {
    queryParamMap: of(convertToParamMap({})),
  };

  beforeEach(async () => {
    spyOn(maplibregl, 'Map').and.returnValue({
      addControl: jasmine.createSpy('addControl'),
      on: jasmine.createSpy('on'),
      remove: jasmine.createSpy('remove'),
      setCenter: jasmine.createSpy('setCenter'),
    } as unknown as maplibregl.Map);

    spyOn(maplibregl, 'NavigationControl').and.returnValue({} as any);
    spyOn(maplibregl, 'AttributionControl').and.returnValue({} as any);
    spyOn(maplibregl, 'Popup').and.returnValue({
      setHTML: jasmine.createSpy('setHTML').and.returnValue({}),
    } as any);
    spyOn(maplibregl, 'Marker').and.returnValue({
      setLngLat: jasmine.createSpy('setLngLat').and.returnValue({
        setPopup: jasmine.createSpy('setPopup').and.returnValue({
          addTo: jasmine.createSpy('addTo'),
        }),
      }),
      remove: jasmine.createSpy('remove'),
    } as any);

    await TestBed.configureTestingModule({
      imports: [VehicleSearchComponent],
      providers: [
        { provide: VehicleService, useValue: vehicleServiceStub },
        { provide: ActivatedRoute, useValue: routeStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(VehicleSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
