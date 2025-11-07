import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Profilo } from './profilo';

describe('Profilo', () => {
  let component: Profilo;
  let fixture: ComponentFixture<Profilo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Profilo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Profilo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
