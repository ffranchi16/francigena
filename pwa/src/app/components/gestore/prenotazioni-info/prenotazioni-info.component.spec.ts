import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrenotazioniInfoComponent } from './prenotazioni-info.component';

describe('PrenotazioniInfoComponent', () => {
  let component: PrenotazioniInfoComponent;
  let fixture: ComponentFixture<PrenotazioniInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrenotazioniInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrenotazioniInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
