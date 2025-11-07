import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViaggioForm } from './viaggio-form';

describe('ViaggioForm', () => {
  let component: ViaggioForm;
  let fixture: ComponentFixture<ViaggioForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViaggioForm]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViaggioForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
