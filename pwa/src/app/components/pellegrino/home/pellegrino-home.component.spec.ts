import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PellegrinoHome } from './pellegrino-home.component';

describe('PellegrinoHome', () => {
  let component: PellegrinoHome;
  let fixture: ComponentFixture<PellegrinoHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PellegrinoHome]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PellegrinoHome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
