import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GestoreModify } from './gestore-modify.component';

describe('GestoreModify', () => {
  let component: GestoreModify;
  let fixture: ComponentFixture<GestoreModify>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestoreModify]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GestoreModify);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
