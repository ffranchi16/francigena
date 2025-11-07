import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestoreHome } from './gestore-home.component';

describe('GestoreHome', () => {
  let component: GestoreHome;
  let fixture: ComponentFixture<GestoreHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestoreHome]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestoreHome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
